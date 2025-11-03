import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'
import { MdPhone, MdPrint, MdTranslate } from 'react-icons/md'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function PrintIngredientSlip({ apiBase }) {
  const { t } = useI18n()
  const { id } = useParams()
  const headers = useAuthHeaders()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [translateLang, setTranslateLang] = useState('en')
  const translateElementRef = useRef(null)

  // Load Google Translate script and handle translation
  useEffect(() => {
    let script = null
    let isInitialized = false

    const initializeTranslate = () => {
      if (isInitialized || !translateElementRef.current) return
      
      try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,ur',
              layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
              autoDisplay: false,
              multilanguagePage: true
            },
            translateElementRef.current
          )
          isInitialized = true
        }
      } catch (e) {
        console.warn('Error initializing Google Translate:', e)
      }
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="translate.google.com"]')
    if (existingScript) {
      // Script exists, check if Google Translate is ready
      if (window.google && window.google.translate) {
        initializeTranslate()
      } else {
        // Wait for script to load
        existingScript.addEventListener('load', initializeTranslate)
      }
      return
    }

    // Create and load the script
    script = document.createElement('script')
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    
    // Set up callback
    window.googleTranslateElementInit = () => {
      initializeTranslate()
    }
    
    script.onload = initializeTranslate
    document.body.appendChild(script)
    
    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script)
      }
      if (window.googleTranslateElementInit) {
        delete window.googleTranslateElementInit
      }
      const select = document.querySelector('.goog-te-combo')
      if (select) {
        select.remove()
      }
    }
  }, [])

  // Handle translation when language changes
  useEffect(() => {
    if (!window.google || !window.google.translate || translateLang === 'en') {
      // Reset to English if needed
      if (translateLang === 'en') {
        const iframe = document.querySelector('.goog-te-banner-frame')
        if (iframe) {
          const select = document.querySelector('.goog-te-combo')
          if (select && select.value !== 'en') {
            select.value = 'en'
            select.dispatchEvent(new Event('change'))
          }
        }
      }
      return
    }
    
    // Wait a bit for the widget to be ready
    const timer = setTimeout(() => {
      const select = document.querySelector('.goog-te-combo')
      if (select) {
        // Map our language code to Google Translate language code
        const langCode = translateLang === 'ur' ? 'ur' : 'en'
        
        // Check if already set to avoid unnecessary changes
        if (select.value !== langCode) {
          select.value = langCode
          
          // Trigger the change event to apply translation
          const event = new Event('change', { bubbles: true })
          select.dispatchEvent(event)
          
          // Also try click to ensure it triggers
          select.click()
        }
      }
    }, 200)
    
    return () => clearTimeout(timer)
  }, [translateLang])

  useEffect(()=>{
    if (!id) return
    (async ()=>{
      try {
        // Fetch all ingredients and categories first to get category mapping
        const [ingredientsRes, categoriesRes] = await Promise.all([
          fetch(`${apiBase}/ingredients`, { headers }),
          fetch(`${apiBase}/categories`, { headers })
        ])
        const allIngredients = await ingredientsRes.json()
        const allCategories = await categoriesRes.json()
        
        // Create mapping: ingredient name -> category info
        const ingredientCategoryMap = new Map()
        allIngredients.forEach(ing => {
          const category = allCategories.find(cat => cat.id === ing.category_id)
          ingredientCategoryMap.set(ing.name.toLowerCase().trim(), {
            category_id: ing.category_id,
            category_name: category ? category.name : 'Uncategorized',
            ingredient_name: ing.name
          })
        })
        
        // Check if this order belongs to a group (from localStorage)
        const groupKey = `order_group_${id}`
        let groupData = localStorage.getItem(groupKey)
        let orderIds = [id]
        
        // If not in localStorage, try to detect group by fetching all orders
        if (!groupData) {
          try {
            const allOrdersRes = await fetch(`${apiBase}/orders`, { headers })
            const allOrders = await allOrdersRes.json()
            
            // Find current order
            const currentOrder = allOrders.find(o => o.id === Number(id))
            if (currentOrder) {
              const orderTime = new Date(currentOrder.created_at).getTime()
              const customerId = currentOrder.customer_id
              
              // Find orders from same customer within 10 seconds
              const relatedOrders = allOrders.filter(o => {
                if (o.id === Number(id)) return false
                const oTime = new Date(o.created_at).getTime()
                const timeDiff = Math.abs(orderTime - oTime)
                return o.customer_id === customerId && timeDiff <= 10000 // 10 seconds
              })
              
              if (relatedOrders.length > 0) {
                orderIds = [Number(id), ...relatedOrders.map(o => o.id)]
                // Store in localStorage for future use
                localStorage.setItem(groupKey, JSON.stringify({ 
                  orderIds, 
                  timestamp: orderTime 
                }))
              }
            }
          } catch (e) {
            console.warn('Failed to detect order group', e)
          }
        } else {
          try {
            const group = JSON.parse(groupData)
            if (group.orderIds && Array.isArray(group.orderIds)) {
              orderIds = group.orderIds
            }
          } catch (e) {
            console.warn('Failed to parse order group data', e)
          }
        }
        
        // Fetch all orders in the group
        const orderPromises = orderIds.map(orderId => 
          fetch(`${apiBase}/orders/${orderId}/slips`, { headers }).then(r => r.json())
        )
        
        const orderData = await Promise.all(orderPromises)
        
        // Debug: Log the raw API response structure
        console.log('Order data from API:', orderData)
        
        // Get ingredient data from all orders - organized by category
        const ingredientTotalMap = new Map() // For final totals by ingredient name + unit
        
        orderData.forEach((d, idx) => {
          // Try multiple ways to get the data structure
          const slip = d.ingredientSlip || d.ingredients || d
          const order = d.orderSlip || d.order || d
          
          // Get items from different possible structures
          let items = []
          if (Array.isArray(slip.items)) {
            items = slip.items
          } else if (Array.isArray(slip.ingredients)) {
            items = slip.ingredients
          } else if (Array.isArray(slip)) {
            items = slip
          } else if (d.items) {
            items = Array.isArray(d.items) ? d.items : []
          } else if (d.ingredients) {
            items = Array.isArray(d.ingredients) ? d.ingredients : []
          }
          
          items.forEach(item => {
            // Normalize ingredient name (trim, lowercase for comparison) and unit
            let ingredientName = ''
            let ingredientUnit = ''
            
            // Try multiple ways to get ingredient name
            if (item.name) ingredientName = String(item.name).trim()
            else if (item.ingredient_name) ingredientName = String(item.ingredient_name).trim()
            else if (item.ingredient?.name) ingredientName = String(item.ingredient.name).trim()
            else if (item.ingredient_name_raw) ingredientName = String(item.ingredient_name_raw).trim()
            else {
              console.warn('Ingredient name not found in item:', item)
              return
            }
            
            // Try multiple ways to get ingredient unit
            ingredientUnit = String(
              item.unit || 
              item.ingredient_unit ||
              item.ingredient?.unit || 
              ''
            ).trim()
            
            // Try multiple field names for amount - prioritize scaled_amount
            let amount = 0
            if (item.scaled_amount !== undefined && item.scaled_amount !== null) {
              amount = Number(item.scaled_amount)
            } else if (item.scaledAmount !== undefined && item.scaledAmount !== null) {
              amount = Number(item.scaledAmount)
            } else if (item.amount !== undefined && item.amount !== null) {
              amount = Number(item.amount)
            } else if (item.scaled_amount_per_base !== undefined) {
              amount = Number(item.scaled_amount_per_base)
            } else if (item.total_amount !== undefined) {
              amount = Number(item.total_amount)
            } else if (item.amount_per_base !== undefined) {
              amount = Number(item.amount_per_base)
              console.warn(`Using base amount for ${ingredientName}, may need scaling:`, item)
            }
            
            // Only process if we have a valid amount and name
            if (isNaN(amount) || amount <= 0) {
              return
            }
            
            // Get category info from mapping
            const normalizedName = ingredientName.toLowerCase().trim()
            const categoryInfo = ingredientCategoryMap.get(normalizedName) || {
              category_id: null,
              category_name: 'Uncategorized',
              ingredient_name: ingredientName
            }
            
            // Aggregate by ingredient name + unit
            const normalizedUnit = ingredientUnit.toLowerCase().trim()
            const key = `${normalizedName}_${normalizedUnit}`
            
            if (ingredientTotalMap.has(key)) {
              const existing = ingredientTotalMap.get(key)
              existing.amount = Number((existing.amount + amount).toFixed(4))
            } else {
              ingredientTotalMap.set(key, {
                name: categoryInfo.ingredient_name,
                amount: Number(amount.toFixed(4)),
                unit: ingredientUnit,
                category_id: categoryInfo.category_id,
                category_name: categoryInfo.category_name
              })
            }
          })
        })
        
        // Group ingredients by category
        const ingredientsByCategory = new Map()
        ingredientTotalMap.forEach((ing) => {
          const catName = ing.category_name || 'Uncategorized'
          if (!ingredientsByCategory.has(catName)) {
            ingredientsByCategory.set(catName, [])
          }
          ingredientsByCategory.get(catName).push(ing)
        })
        
        // Sort ingredients within each category by name
        ingredientsByCategory.forEach((ings, catName) => {
          ings.sort((a, b) => a.name.localeCompare(b.name))
        })
        
        // Convert to array of categories with ingredients, sorted by category name
        const categoriesWithIngredients = Array.from(ingredientsByCategory.entries())
          .map(([category_name, ingredients]) => ({ category_name, ingredients }))
          .sort((a, b) => a.category_name.localeCompare(b.category_name))
        
        // Get base data from first order
        const firstOrder = orderData[0]
        const orderInfo = firstOrder.orderSlip || firstOrder.order || firstOrder
        
        const groupedData = {
          order_id: orderInfo.order_id || orderInfo.orderId || orderInfo.id || id,
          customer_name: orderInfo.customer_name || orderInfo.customerName,
          customer_phone: orderInfo.customer_phone || orderInfo.customerPhone,
          categoriesWithIngredients: categoriesWithIngredients,
          isGrouped: orderIds.length > 1,
          groupSize: orderIds.length
        }
        
        if (categoriesWithIngredients.length === 0) {
          console.warn('No ingredients found in slip data')
        }
        
        setData(groupedData)
        setTimeout(()=>window.print(), 300)
      } catch (error) {
        console.error('Failed to load slip:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    })()
  },[id, apiBase, headers])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-500 mt-3">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 font-semibold mb-2">{t('failedToLoad')} {t('ingredientSlip').toLowerCase()}</p>
          <p className="text-sm text-gray-500 mb-4">Please check if the order exists and try again.</p>
          <Link to="/orders" className="btn-primary inline-block">← {t('backToOrders')}</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: legal;
            margin: 0.5in;
          }
          .page-break {
            page-break-after: always;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide Google Translate elements when printing */
          .goog-te-banner-frame,
          .goog-te-menu-frame,
          .skiptranslate {
            display: none !important;
          }
          body {
            top: 0 !important;
          }
        }
        .print-container {
          width: 8.5in;
          min-height: 14in;
          margin: 0 auto;
        }
        .page {
          min-height: 13in;
          padding: 0.5in;
          box-sizing: border-box;
        }
        /* Hide Google Translate banner */
        .goog-te-banner-frame {
          display: none !important;
        }
        .goog-te-menu-frame {
          max-width: 100% !important;
        }
        body {
          top: 0 !important;
        }
        /* Hide the "Select Language" text */
        .goog-te-gadget {
          color: transparent !important;
        }
        .goog-te-gadget .goog-te-combo {
          margin: 0 !important;
        }
        .skiptranslate {
          display: none !important;
        }
      `}</style>
      
      <div className="no-print mb-6 max-w-4xl mx-auto px-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Link to="/orders" className="text-blue-600 hover:text-blue-800 inline-block">← {t('backToOrders')}</Link>
          <button 
            onClick={() => window.print()} 
            className="btn-primary"
          >
            <MdPrint className="inline text-base" /> {t('print')}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <MdTranslate className="text-lg text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Translate Page:</label>
            <select
              value={translateLang}
              onChange={(e) => setTranslateLang(e.target.value)}
              className="border-2 border-gray-200 px-3 py-1.5 rounded-lg text-sm bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="en">English</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>
        </div>
        {/* Google Translate Element - hidden from view but functional */}
        <div ref={translateElementRef} style={{ display: 'none' }}></div>
      </div>

      <div className="print-container">
        <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg page">
          {/* Header - Print on first page only */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Hassan Cook Chinese Food Specialist</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">{t('ingredientSlip')}</h2>
            <div className="text-base text-gray-600">
              <p className="font-semibold">{t('orderNumber')}{data.order_id || data.orderId || 'N/A'}</p>
              {data.isGrouped && (
                <p className="text-xs text-gray-500 mt-1">({data.groupSize} {data.groupSize === 1 ? 'dish' : 'dishes'} - Combined Ingredients)</p>
              )}
              {data.customer_name && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="font-semibold text-gray-800 text-sm">Customer: {data.customer_name || 'N/A'}</p>
                  {data.customer_phone && <p className="text-xs text-gray-600 flex items-center gap-1 justify-center mt-1"><MdPhone className="text-xs" /> {data.customer_phone}</p>}
                </div>
              )}
            </div>
          </div>
          
          {/* Ingredients grouped by category */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              {t('requiredIngredients')}
            </h2>
            
            {data.categoriesWithIngredients && data.categoriesWithIngredients.length > 0 ? (
              data.categoriesWithIngredients.map((categoryData, catIdx) => {
                const isLastCategory = catIdx === data.categoriesWithIngredients.length - 1
                const shouldPageBreak = catIdx > 0 && catIdx % 3 === 0 // Page break after every 3 categories
                
                return (
                  <div key={catIdx} className={shouldPageBreak ? 'page-break' : ''}>
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-gray-900 mb-2 pb-1 border-b border-gray-300 bg-gray-50 px-2 py-1">
                        {categoryData.category_name}
                      </h3>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('ingredient')}</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">{t('amount')}</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">{t('unit')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryData.ingredients.map((ing, ingIdx) => {
                            const amount = Number(ing.amount || 0)
                            const displayAmount = amount.toFixed(4).replace(/\.?0+$/, '')
                            
                            return (
                              <tr key={ingIdx} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                                  {ing.name || 'Unknown'}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 text-center">
                                  {displayAmount}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700 text-center">
                                  {ing.unit || ''}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {!isLastCategory && <div className="mb-3"></div>}
                  </div>
                )
              })
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No ingredients found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
            <p>{t('generatedOn')} {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </>
  )
}

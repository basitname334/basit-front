import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'
import { MdPhone, MdPrint } from 'react-icons/md'

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

  useEffect(()=>{
    if (!id) return
    (async ()=>{
      try {
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
        
        // Get ingredient data from all orders - organized by dish first, then totals
        const dishInfo = []
        const dishesWithIngredients = [] // Array of { dish_name, quantity, unit, order_id, ingredients: [] }
        const ingredientTotalMap = new Map() // For final totals
        
        orderData.forEach((d, idx) => {
          // Try multiple ways to get the data structure
          const slip = d.ingredientSlip || d.ingredients || d
          const order = d.orderSlip || d.order || d
          
          // Debug: Log the structure for this order
          console.log(`Processing order ${orderIds[idx]}:`, { slip, order })
          
          // Helper to convert kg to dish unit for display
          const getDisplayUnit = (unit) => {
            if (!unit) return ''
            const unitLower = unit.toLowerCase().trim()
            if (unitLower === 'kg') return 'dish'
            return unit
          }
          
          const currentDishInfo = {
            dish_name: order.dish_name || order.dishName,
            quantity: order.quantity || order.requested_quantity,
            unit: getDisplayUnit(order.unit || order.requested_unit),
            order_id: order.order_id || order.orderId || order.id || orderIds[idx]
          }
          
          dishInfo.push(currentDishInfo)
          
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
          
          // Debug: log items if needed
          if (items.length === 0) {
            console.warn(`No ingredients found for order ${orderIds[idx]}`, { slip, order, fullData: d })
          } else {
            console.log(`Found ${items.length} ingredients for order ${orderIds[idx]}`)
          }
          
          // Process ingredients for this dish
          const dishIngredients = []
          
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
              // This is base amount, we need scaled - but if we only have this, use it
              amount = Number(item.amount_per_base)
              console.warn(`Using base amount for ${ingredientName}, may need scaling:`, item)
            }
            
            // Only process if we have a valid amount and name
            if (isNaN(amount)) {
              console.warn(`Invalid amount (NaN) for ingredient ${ingredientName}:`, item)
              return
            }
            
            if (amount <= 0) {
              console.warn(`Zero or negative amount for ingredient ${ingredientName}:`, amount, item)
              return
            }
            
            // Add to dish ingredients
            dishIngredients.push({
              name: ingredientName,
              amount: Number(amount.toFixed(4)),
              unit: ingredientUnit
            })
            
            // Also add to total map for aggregation
            const normalizedName = ingredientName.toLowerCase().replace(/\s+/g, ' ').trim()
            const normalizedUnit = ingredientUnit.toLowerCase().trim()
            const key = `${normalizedName}_${normalizedUnit}`
            
            if (ingredientTotalMap.has(key)) {
              const existing = ingredientTotalMap.get(key)
              existing.amount = Number((existing.amount + amount).toFixed(4))
            } else {
              ingredientTotalMap.set(key, {
                name: ingredientName,
                amount: Number(amount.toFixed(4)),
                unit: ingredientUnit
              })
            }
          })
          
          // Sort ingredients by name for this dish
          dishIngredients.sort((a, b) => a.name.localeCompare(b.name))
          
          dishesWithIngredients.push({
            ...currentDishInfo,
            ingredients: dishIngredients
          })
        })
        
        // Convert total map to array and sort by name
        const allIngredients = Array.from(ingredientTotalMap.values())
        allIngredients.sort((a, b) => a.name.localeCompare(b.name))
        
        // Debug: log total ingredients
        console.log(`Total unique ingredients after aggregation: ${allIngredients.length}`, allIngredients)
        
        // Get base data from first order
        const firstOrder = orderData[0]
        const slipData = firstOrder.ingredientSlip || firstOrder.ingredients || firstOrder
        const orderInfo = firstOrder.orderSlip || firstOrder.order || firstOrder
        
        const groupedData = {
          ...slipData,
          order_id: orderInfo.order_id || orderInfo.orderId || orderInfo.id || id,
          dish_name: orderInfo.dish_name || orderInfo.dishName,
          quantity: orderInfo.quantity || orderInfo.requested_quantity,
          unit: orderInfo.unit || orderInfo.requested_unit,
          customer_name: orderInfo.customer_name || orderInfo.customerName,
          customer_phone: orderInfo.customer_phone || orderInfo.customerPhone,
          items: allIngredients,
          ingredients: allIngredients,
          dishes: dishInfo,
          dishesWithIngredients: dishesWithIngredients, // Ingredients per dish
          isGrouped: orderIds.length > 1,
          groupSize: orderIds.length,
          requested_quantity: orderInfo.requested_quantity || orderInfo.quantity,
          requested_unit: orderInfo.requested_unit || orderInfo.unit
        }
        
        if (!groupedData.items || groupedData.items.length === 0) {
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="no-print mb-6">
        <Link to="/orders" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">← {t('backToOrders')}</Link>
        <button 
          onClick={() => window.print()} 
          className="btn-primary ml-4"
        >
          <MdPrint className="inline text-base" /> {t('print')}
        </button>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('ingredientSlip')}</h1>
          <div className="text-lg text-gray-600">
            <p className="font-semibold">{t('orderNumber')}{data.order_id || data.orderId || 'N/A'}</p>
            {data.isGrouped && (
              <p className="text-sm text-gray-500 mt-1">({data.groupSize} {data.groupSize === 1 ? 'dish' : 'dishes'} - Combined Ingredients)</p>
            )}
            {data.dishes && data.dishes.length > 0 ? (
              <div className="mt-2 space-y-1">
                {data.dishes.map((dish, idx) => (
                  <p key={idx} className="text-sm">
                    {dish.dish_name || 'N/A'} • {dish.quantity || 'N/A'} {dish.unit || ''}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-1">
                {data.dish_name || data.dishName || 'N/A'} • {data.requested_quantity || data.quantity || 'N/A'} {(() => {
                  const unit = data.requested_unit || data.unit || ''
                  return unit.toLowerCase().trim() === 'kg' ? 'dish' : unit
                })()}
              </p>
            )}
            {data.customer_name && (
              <div className="mt-3 pt-3 border-t border-gray-300 text-base">
                <p className="font-semibold text-gray-800">Customer: {data.customer_name || data.customerName || 'N/A'}</p>
                {data.customer_phone && <p className="text-sm text-gray-600 flex items-center gap-1 justify-center"><MdPhone className="text-base" /> {data.customer_phone}</p>}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('requiredIngredients')}
            {data.isGrouped && (
              <span className="text-sm font-normal text-gray-500 ml-2">({data.groupSize} {data.groupSize === 1 ? 'dish' : 'dishes'})</span>
            )}
          </h2>
          
          {/* Show ingredients per dish first if grouped */}
          {data.isGrouped && data.dishesWithIngredients && data.dishesWithIngredients.length > 0 && (
            <div className="mb-6 space-y-4">
              {data.dishesWithIngredients.map((dishData, dishIdx) => (
                <div key={dishIdx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    {dishData.dish_name} • {dishData.quantity} {dishData.unit}
                    {dishData.order_id && (
                      <span className="text-sm font-normal text-blue-600 ml-2">(Order #{dishData.order_id})</span>
                    )}
                  </h3>
                  {dishData.ingredients && dishData.ingredients.length > 0 ? (
                    <table className="table-modern w-full">
                      <thead>
                        <tr>
                          <th>{t('ingredient')}</th>
                          <th>{t('amount')}</th>
                          <th>{t('unit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dishData.ingredients.map((ing, ingIdx) => {
                          const amount = Number(ing.amount || 0)
                          const displayAmount = amount.toFixed(4).replace(/\.?0+$/, '')
                          return (
                            <tr key={ingIdx}>
                              <td className="font-medium">{ing.name || 'Unknown'}</td>
                              <td className="font-semibold">{displayAmount}</td>
                              <td>{ing.unit || ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-500">No ingredients found for this dish</p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Show totals section */}
          {data.isGrouped && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-bold text-green-900 mb-3">Total Ingredients (Combined)</h3>
              <p className="text-sm text-green-800 mb-3">
                <strong>Note:</strong> Same ingredients from different dishes have been added together.
              </p>
            </div>
          )}
          
          <table className="table-modern w-full">
            <thead>
              <tr>
                <th>{t('ingredient')}</th>
                <th>{t('amount')}</th>
                <th>{t('unit')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || data.ingredients || []).length > 0 ? (
                (data.items || data.ingredients || []).map((x,idx)=> {
                  // Ensure we get the correct amount
                  const amount = Number(x.amount || x.scaled_amount || x.scaledAmount || 0)
                  // Round to 4 decimal places, but remove trailing zeros
                  const displayAmount = amount.toFixed(4).replace(/\.?0+$/, '')
                  
                  return (
                    <tr key={idx}>
                      <td className="font-medium">{x.name || x.ingredient_name || 'Unknown'}</td>
                      <td className="font-semibold">{displayAmount}</td>
                      <td>{x.unit || ''}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="3" className="text-center text-gray-500 py-4">No ingredients found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-300 text-sm text-gray-500 text-center">
          <p>{t('generatedOn')} {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

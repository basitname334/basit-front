import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'
import { MdPhone, MdEmail, MdLocationOn, MdPrint } from 'react-icons/md'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function PrintOrderSlip({ apiBase }) {
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
        
        // Combine all orders into a single slip
        const firstOrder = orderData[0]
        const slipData = firstOrder.orderSlip || firstOrder.order || firstOrder
        
        if (!slipData || (!slipData.order_id && !slipData.orderId && !slipData.id)) {
          throw new Error('Invalid slip data received')
        }
        
        // Helper function to convert kg to dish unit for display
        const getDisplayUnit = (unit) => {
          if (!unit) return ''
          const unitLower = unit.toLowerCase().trim()
          // If unit is kg, convert to 'dish' for display (kg is only for ingredients)
          if (unitLower === 'kg') return 'dish'
          return unit
        }
        
        // Add all dishes from the group
        const allDishes = orderData.map((d, idx) => {
          const order = d.orderSlip || d.order || d
          const originalUnit = order.unit || order.requested_unit || ''
          return {
            dish_name: order.dish_name || order.dishName,
            quantity: order.quantity || order.requested_quantity,
            unit: getDisplayUnit(originalUnit),
            order_id: order.order_id || order.orderId || order.id || orderIds[idx]
          }
        }).filter(d => d.dish_name)
        
        // Combine into grouped slip data
        const groupedData = {
          ...slipData,
          order_id: slipData.order_id || slipData.orderId || slipData.id || id,
          dishes: allDishes,
          isGrouped: orderIds.length > 1,
          groupSize: orderIds.length
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
          <p className="text-red-600 font-semibold mb-2">{t('failedToLoad')} {t('orderSlip').toLowerCase()}</p>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hassan Cook Chinese Food Specialist</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">{t('orderSlip')}</h2>
          <div className="text-lg text-gray-600">
            <p className="font-semibold">{t('orderNumber')}{data.order_id || data.orderId || data.id || 'N/A'}</p>
            {data.isGrouped && (
              <p className="text-sm text-gray-500 mt-1">({data.groupSize} {data.groupSize === 1 ? 'dish' : 'dishes'})</p>
            )}
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          {data.customer_name && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">Customer Information</p>
              <p className="text-lg font-bold text-gray-900">{data.customer_name || data.customerName || 'N/A'}</p>
              {data.customer_phone && <p className="text-sm text-gray-700 mt-1 flex items-center gap-1"><MdPhone className="text-base" /> {data.customer_phone}</p>}
              {data.customer_email && <p className="text-sm text-gray-700 flex items-center gap-1"><MdEmail className="text-base" /> {data.customer_email}</p>}
              {data.customer_address && <p className="text-sm text-gray-700 mt-1 flex items-center gap-1"><MdLocationOn className="text-base" /> {data.customer_address}</p>}
            </div>
          )}
          
          {data.dishes && data.dishes.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-3">{data.dishes.length === 1 ? t('dishName') : 'Ordered Dishes'}</p>
              <div className="space-y-3">
                {data.dishes.map((dish, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">{t('dishName')}</p>
                        <p className="text-base font-semibold text-gray-900">{dish.dish_name || 'N/A'}</p>
                        {data.isGrouped && dish.order_id && (
                          <p className="text-xs text-gray-400 mt-1">Order #{dish.order_id}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">{t('quantity')}</p>
                        <p className="text-base font-semibold text-gray-900">
                          {dish.quantity || 'N/A'} {dish.unit || ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('dishName')}</p>
                <p className="text-lg font-semibold text-gray-900">{data.dish_name || data.dishName || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{t('quantity')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {data.quantity || data.requested_quantity || 'N/A'} {(() => {
                    const unit = data.unit || data.requested_unit || ''
                    return unit.toLowerCase().trim() === 'kg' ? 'dish' : unit
                  })()}
                </p>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('orderDateTime')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-300 text-sm text-gray-500 text-center">
          <p>{t('generatedOn')} {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

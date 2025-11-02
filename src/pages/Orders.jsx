import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'
import { MdReceipt, MdDashboard, MdPhone, MdDescription, MdPrint, MdInbox, MdLightbulb } from 'react-icons/md'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function Orders({ apiBase }) {
  const { t } = useI18n()
  const headers = useAuthHeaders()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupedOrders, setGroupedOrders] = useState({})

  // Function to detect and group orders placed at the same time by the same customer
  function detectOrderGroups(ordersList) {
    const groups = {}
    const processed = new Set()
    
    // Sort orders by created_at
    const sortedOrders = [...ordersList].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    )
    
    sortedOrders.forEach(order => {
      if (processed.has(order.id)) return
      
      const orderTime = new Date(order.created_at).getTime()
      const customerId = order.customer_id
      
      // Find orders from same customer within 10 seconds
      const relatedOrders = sortedOrders.filter(o => {
        if (processed.has(o.id) || o.id === order.id) return false
        const oTime = new Date(o.created_at).getTime()
        const timeDiff = Math.abs(orderTime - oTime)
        return o.customer_id === customerId && timeDiff <= 10000 // 10 seconds
      })
      
      if (relatedOrders.length > 0) {
        const groupKey = order.id
        const groupIds = [order.id, ...relatedOrders.map(o => o.id)]
        
        // Store group info
        groupIds.forEach(id => {
          groups[id] = { groupKey, orderIds: groupIds }
          processed.add(id)
        })
        
        // Store in localStorage for slip pages
        localStorage.setItem(`order_group_${order.id}`, JSON.stringify({ 
          orderIds: groupIds, 
          timestamp: orderTime 
        }))
      } else {
        processed.add(order.id)
      }
    })
    
    return groups
  }

  useEffect(()=>{
    (async ()=>{
      try {
        const res = await fetch(`${apiBase}/orders`, { headers })
        const ordersData = await res.json()
        setOrders(ordersData)
        
        // Detect and store order groups
        const groups = detectOrderGroups(ordersData)
        setGroupedOrders(groups)
      } catch (error) {
        console.error('Failed to load orders:', error)
      } finally {
        setLoading(false)
      }
    })()
  },[])

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">{t('orderHistory')}</h1>
            <p className="text-sm sm:text-base text-indigo-100">{t('viewAllOrders')}</p>
          </div>
          <MdReceipt className="text-3xl sm:text-4xl lg:text-5xl" />
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <MdDashboard className="text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('allOrders')}</h2>
              <p className="text-sm text-gray-500">{t('manageAndView')}</p>
            </div>
          </div>
          <span className="badge badge-info">{orders.length} {orders.length === 1 ? t('singleOrder') : t('multipleOrders')}</span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 mt-3">{t('loadingOrders')}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <MdInbox className="text-5xl mb-3 block mx-auto text-gray-400" />
            <p className="text-gray-500 font-medium">{t('noOrdersYet')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('placeFirstOrder')}</p>
            <Link to="/user" className="btn-primary inline-block mt-4">
              {t('newOrder')}
            </Link>
          </div>
        ) : (
          <>
            <div className="info-box info-box-blue mb-4">
              <p className="text-sm font-medium mb-1 flex items-center gap-1"><MdLightbulb className="text-base" /> {t('tips')}:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>{t('tip1')}</li>
                <li>{t('tip2')}</li>
                <li>{t('tip3')}</li>
              </ul>
            </div>

            <div className="table-wrapper">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>{t('orderNumber')}</th>
                    <th className="hidden sm:table-cell">Customer</th>
                    <th>{t('dish')}</th>
                    <th>{t('quantity')}</th>
                    <th className="hidden md:table-cell">{t('dateTime')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o=> {
                    const group = groupedOrders[o.id]
                    const primaryOrderId = group ? group.groupKey : o.id
                    const isGrouped = group && group.orderIds && group.orderIds.length > 1
                    const isPrimaryOrder = !group || group.groupKey === o.id
                    
                    // Skip rendering if this is a grouped order that's not the primary one
                    // OR render all but mark them as grouped
                    
                    return (
                      <tr 
                        key={o.id} 
                        className={`hover:bg-gray-50 ${isGrouped ? 'bg-blue-50/30' : ''} ${!isPrimaryOrder && isGrouped ? 'opacity-75' : ''}`}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-indigo-600">#{o.id}</span>
                            {isGrouped && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded" title={`Part of group with ${group.orderIds.length} orders`}>
                                Group ({group.orderIds.length})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="font-medium text-gray-900">{o.customer_name || 'N/A'}</div>
                          {o.customer_phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1"><MdPhone className="text-xs" /> {o.customer_phone}</div>
                          )}
                        </td>
                        <td>
                          <div className="font-medium text-gray-900">{o.dish_name}</div>
                          <div className="text-xs text-gray-500 sm:hidden mt-1">
                            {o.customer_name || 'N/A'}
                            {o.customer_phone && ` • ☎ ${o.customer_phone}`}
                          </div>
                          {isGrouped && !isPrimaryOrder && (
                            <div className="text-xs text-blue-600 mt-1">Grouped with Order #{primaryOrderId}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-info whitespace-nowrap">
                            {o.requested_quantity} {o.requested_unit}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <div className="text-sm text-gray-600">
                            {new Date(o.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(o.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Link 
                              to={`/orders/${primaryOrderId}/ingredient-slip`} 
                              className="px-2 sm:px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-100 transition-colors text-center"
                              title={isGrouped ? `Combined ${t('ingredientSlip')} for ${group.orderIds.length} orders` : t('ingredientSlip')}
                            >
                              <MdDescription className="inline text-base" /> <span className="hidden sm:inline">{t('ingredientSlip')}</span>
                            </Link>
                            <Link 
                              to={`/orders/${primaryOrderId}/order-slip`} 
                              className="px-2 sm:px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-100 transition-colors text-center"
                              title={isGrouped ? `Combined ${t('orderSlip')} for ${group.orderIds.length} orders` : t('orderSlip')}
                            >
                              <MdPrint className="inline text-base" /> <span className="hidden sm:inline">{t('orderSlip')}</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

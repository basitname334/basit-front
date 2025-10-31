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
        const res = await fetch(`${apiBase}/orders/${id}/slips`, { headers })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch slip data: ${res.status}`)
        }
        const d = await res.json()
        // Handle different response structures
        const slipData = d.ingredientSlip || d.ingredients || d
        if (!slipData) {
          throw new Error('No slip data received')
        }
        // Validate that we have some meaningful data
        if (!slipData.items && !slipData.ingredients && (!slipData.order_id && !slipData.orderId)) {
          console.warn('Slip data may be incomplete:', slipData)
        }
        setData(slipData)
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
            <p className="mt-1">
              {data.dish_name || data.dishName || 'N/A'} • {data.requested_quantity || data.quantity || 'N/A'} {data.requested_unit || data.unit || ''}
            </p>
            {data.customer_name && (
              <div className="mt-3 pt-3 border-t border-gray-300 text-base">
                <p className="font-semibold text-gray-800">Customer: {data.customer_name || data.customerName || 'N/A'}</p>
                {data.customer_phone && <p className="text-sm text-gray-600 flex items-center gap-1"><MdPhone className="text-base" /> {data.customer_phone}</p>}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('requiredIngredients')}</h2>
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
                (data.items || data.ingredients || []).map((x,idx)=> (
                  <tr key={idx}>
                    <td className="font-medium">{x.name || x.ingredient_name || 'Unknown'}</td>
                    <td>{Number((x.amount || x.scaled_amount || x.scaledAmount || 0).toFixed(4))}</td>
                    <td>{x.unit || ''}</td>
                  </tr>
                ))
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

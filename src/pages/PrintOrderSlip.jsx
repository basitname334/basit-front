import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'

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
    (async ()=>{
      try {
        const res = await fetch(`${apiBase}/orders/${id}/slips`, { headers })
        const d = await res.json()
        setData(d.orderSlip)
        setTimeout(()=>window.print(), 300)
      } catch (error) {
        console.error('Failed to load slip:', error)
      } finally {
        setLoading(false)
      }
    })()
  },[id])

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
          <p className="text-red-600">{t('failedToLoad')} {t('orderSlip').toLowerCase()}</p>
          <Link to="/orders" className="text-blue-600 mt-4 inline-block">← {t('backToOrders')}</Link>
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
          🖨️ {t('print')}
        </button>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-lg">
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('orderSlip')}</h1>
          <div className="text-lg text-gray-600">
            <p className="font-semibold">{t('orderNumber')}{data.order_id}</p>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          {data.customer_name && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">Customer Information</p>
              <p className="text-lg font-bold text-gray-900">{data.customer_name}</p>
              {data.customer_phone && <p className="text-sm text-gray-700 mt-1">📞 {data.customer_phone}</p>}
              {data.customer_email && <p className="text-sm text-gray-700">✉️ {data.customer_email}</p>}
              {data.customer_address && <p className="text-sm text-gray-700 mt-1">📍 {data.customer_address}</p>}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('dishName')}</p>
              <p className="text-lg font-semibold text-gray-900">{data.dish_name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('quantity')}</p>
              <p className="text-lg font-semibold text-gray-900">{data.quantity} {data.unit}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">{t('orderDateTime')}</p>
            <p className="text-lg font-semibold text-gray-900">{new Date(data.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-300 text-sm text-gray-500 text-center">
          <p>{t('generatedOn')} {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

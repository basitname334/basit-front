import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'

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
    (async ()=>{
      try {
        const res = await fetch(`${apiBase}/orders/${id}/slips`, { headers })
        const d = await res.json()
        setData(d.ingredientSlip)
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
          <p className="text-red-600">{t('failedToLoad')} {t('ingredientSlip').toLowerCase()}</p>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('ingredientSlip')}</h1>
          <div className="text-lg text-gray-600">
            <p className="font-semibold">{t('orderNumber')}{data.order_id}</p>
            <p className="mt-1">{data.dish_name} • {data.requested_quantity} {data.requested_unit}</p>
            {data.customer_name && (
              <div className="mt-3 pt-3 border-t border-gray-300 text-base">
                <p className="font-semibold text-gray-800">Customer: {data.customer_name}</p>
                {data.customer_phone && <p className="text-sm text-gray-600">📞 {data.customer_phone}</p>}
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
              {data.items.map((x,idx)=> (
                <tr key={idx}>
                  <td className="font-medium">{x.name}</td>
                  <td>{Number(x.amount.toFixed(4))}</td>
                  <td>{x.unit}</td>
                </tr>
              ))}
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

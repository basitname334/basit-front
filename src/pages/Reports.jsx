import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function Reports({ apiBase }) {
  const { t } = useI18n()
  const headers = useAuthHeaders()
  const [range, setRange] = useState('daily')
  const [data, setData] = useState({ rows: [], totals: { orders_count: 0, revenue: 0, cost: 0, profit: 0 } })
  const [loading, setLoading] = useState(true)

  async function load(r = range) {
    setLoading(true)
    const res = await fetch(`${apiBase}/reports?range=${r}`, { headers })
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(()=>{ load('daily') },[])

  function Tab({ value, label }){
    const active = range === value
    return (
      <button 
        onClick={()=>{ setRange(value); load(value) }}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
      >{label}</button>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="card bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{t('financialReports')}</h1>
            <p className="text-orange-100">{t('trackOrders')}</p>
          </div>
          <div className="text-4xl">💹</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('overview')}</h2>
              <p className="text-sm text-gray-500">{t('aggregateMetrics')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Tab value="daily" label={t('daily')} />
            <Tab value="monthly" label={t('monthly')} />
            <Tab value="yearly" label={t('yearly')} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <p className="text-gray-500 mt-3">{t('loadingReport')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="text-sm text-blue-700">{t('ordersCount')}</div>
                <div className="text-3xl font-bold text-blue-900">{data.totals.orders_count}</div>
              </div>
              <div className="card bg-gradient-to-br from-green-50 to-green-100">
                <div className="text-sm text-green-700">{t('revenue')}</div>
                <div className="text-3xl font-bold text-green-900">Rs. {Number(data.totals.revenue).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-sm text-gray-700">{t('cost')}</div>
                <div className="text-3xl font-bold text-gray-900">Rs. {Number(data.totals.cost).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
                <div className="text-sm text-purple-700">{t('profit')}</div>
                <div className={`text-3xl font-bold ${Number(data.totals.profit) >= 0 ? 'text-purple-900' : 'text-red-600'}`}>Rs. {Number(data.totals.profit).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>{t('period')}</th>
                    <th>{t('ordersCount')}</th>
                    <th>{t('revenue')}</th>
                    <th>{t('cost')}</th>
                    <th>{t('profit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{r.period}</td>
                      <td>{r.orders_count}</td>
                      <td>Rs. {Number(r.revenue || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. {Number(r.cost || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`${Number(r.profit) >= 0 ? '' : 'text-red-600'}`}>Rs. {Number(r.profit || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}



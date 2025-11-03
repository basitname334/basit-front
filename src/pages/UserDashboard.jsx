import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n.jsx'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function UserDashboard({ apiBase }) {
  const { t } = useI18n()
  const headers = useAuthHeaders()
  const [dishes, setDishes] = useState([])
  const [customers, setCustomers] = useState([])
  const [dishId, setDishId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const selectedDish = dishes.find(x => x.id === Number(dishId))
  const baseUnit = selectedDish?.base_unit || unit
  const baseQty = Number(selectedDish?.base_quantity || 0)
  const requestedQty = Number(qty)
  const scaleFactor = baseQty > 0 && requestedQty > 0 ? (requestedQty / baseQty) : null

  useEffect(()=>{
    (async ()=>{
      const [dRes, cRes] = await Promise.all([
        fetch(`${apiBase}/dishes`, { headers }),
        fetch(`${apiBase}/customers`, { headers })
      ])
      const [dData, cData] = await Promise.all([dRes.json(), cRes.json()])
      setDishes(dData)
      setCustomers(cData)
      if (dData.length) { setDishId(dData[0].id); setUnit(dData[0].base_unit) }
      if (cData.length) { setCustomerId(cData[0].id) }
    })()
  },[])

  async function placeOrder() {
    setMessage({ type: '', text: '' })
    setLoading(true)
    
    if (!selectedDish) { 
      setMessage({ type: 'error', text: t('pleaseSelectDish') })
      setLoading(false)
      return 
    }
    if (!(requestedQty > 0)) { 
      setMessage({ type: 'error', text: t('pleaseEnterValidQuantity') })
      setLoading(false)
      return 
    }
    if (!customerId) {
      setMessage({ type: 'error', text: 'Please select a customer' })
      setLoading(false)
      return
    }
    
    try {
      const res = await fetch(`${apiBase}/orders`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ dish_id: Number(dishId), customer_id: Number(customerId), requested_quantity: requestedQty, requested_unit: baseUnit }) 
      })
      const data = await res.json()
      if (!res.ok) { 
        setMessage({ type: 'error', text: data.error || t('orderPlacedFailed') })
        setLoading(false)
        return 
      }
      setMessage({ type: 'success', text: `✅ ${t('orderPlacedSuccess', { id: data.id })}` })
      setQty('')
      setLoading(false)
    } catch (error) {
      setMessage({ type: 'error', text: t('networkError') })
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">{t('newOrder')}</h1>
            <p className="text-sm sm:text-base text-green-100">{t('newOrderSubtitle')}</p>
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl">🛒</div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg border-l-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-400 text-green-800' 
            : 'bg-red-50 border-red-400 text-red-800'
        }`}>
          <strong>{message.type === 'success' ? '✓' : '✗'}</strong> {message.text}
        </div>
      )}

      {/* Order Form Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('orderDetails')}</h2>
              <p className="text-sm text-gray-500">{t('fillForm')}</p>
            </div>
          </div>
        </div>

        <div className="info-box info-box-blue mb-6">
          <p className="text-sm font-medium mb-1">💡 {t('howToPlaceOrder')}:</p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>{t('howToPlaceOrder1')}</li>
            <li>{t('howToPlaceOrder2')}</li>
            <li>{t('howToPlaceOrder3')}</li>
            <li>{t('howToPlaceOrder4')}</li>
            <li>{t('howToPlaceOrder5')}</li>
          </ol>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <select 
              className="input-modern" 
              value={customerId} 
              onChange={e=>setCustomerId(e.target.value)}
            >
              {customers.length === 0 ? (
                <option value="">No customers available</option>
              ) : (
                customers.map(c=> <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)
              )}
            </select>
            {customers.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">⚠️ Please ask admin to add customers first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('selectDish')} <span className="text-red-500">*</span>
            </label>
            <select 
              className="input-modern" 
              value={dishId} 
              onChange={e=>{ 
                const d = dishes.find(x=>x.id===Number(e.target.value))
                setDishId(e.target.value)
                setUnit(d?.base_unit || '')
                setQty('')
              }}
            >
              {dishes.length === 0 ? (
                <option value="">{t('noDishesAvailable')}</option>
              ) : (
                dishes.map(d=> <option key={d.id} value={d.id}>{d.name} ({t('baseQuantity')}: {d.base_quantity} {d.base_unit})</option>)
              )}
            </select>
            {dishes.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">⚠️ {t('askAdminToCreate')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('quantity')} <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                step="0.01"
                className="input-modern" 
                value={qty} 
                onChange={e=>setQty(e.target.value)}
                placeholder={t('quantityPlaceholder')}
                min="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">{t('quantityDesc')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('unit')}
              </label>
              <input 
                className="input-modern bg-gray-100" 
                value={baseUnit} 
                disabled 
                readOnly 
              />
              <p className="text-xs text-gray-500 mt-1">{t('unitAutoSet')}</p>
            </div>
          </div>

          {/* Scale Factor Info */}
          {selectedDish && scaleFactor && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📊</span>
                <span className="font-semibold text-blue-900">{t('scalingInformation')}</span>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>{t('baseQuantityLabel')}</strong> {selectedDish.base_quantity} {selectedDish.base_unit}</p>
                <p><strong>{t('requestedQuantity')}</strong> {requestedQty} {baseUnit}</p>
                <p><strong>{t('scaleFactor')}</strong> ×{Number(scaleFactor.toFixed(4))}</p>
                <p className="text-xs mt-2 text-blue-700">{t('allIngredientsScaled')}</p>
              </div>
            </div>
          )}

          {/* Ingredient Preview */}
          {selectedDish && scaleFactor && selectedDish.ingredients?.length > 0 && (
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📋</span>
                <span>{t('ingredientPreview')}</span>
              </h3>
              <p className="text-sm text-gray-600 mb-3">{t('ingredientsNeeded')}</p>
              <div className="table-wrapper">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>{t('ingredient')}</th>
                      <th>{t('amountRequired')}</th>
                      <th>{t('unit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDish.ingredients.map((ing, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{ing.ingredient_name}</td>
                        <td>{Number((ing.amount_per_base * scaleFactor).toFixed(4))}</td>
                        <td>{ing.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <button 
              onClick={placeOrder} 
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedDish || !qty || requestedQty <= 0}
            >
              {loading ? `⏳ ${t('placingOrder')}` : `✅ ${t('placeOrderButton')}`}
            </button>
            <Link 
              to="/orders" 
              className="btn-secondary text-center"
            >
              📋 {t('viewOrdersButton')}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {dishes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🍽️</div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{dishes.length}</p>
                <p className="text-sm text-blue-700">{t('availableDishes')}</p>
              </div>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📦</div>
              <div>
                <p className="text-2xl font-bold text-green-900">{selectedDish?.ingredients?.length || 0}</p>
                <p className="text-sm text-green-700">{t('ingredientsInSelectedDish')}</p>
              </div>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚡</div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{scaleFactor ? Number(scaleFactor.toFixed(2)) : '—'}</p>
                <p className="text-sm text-purple-700">{t('currentScaleFactor')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

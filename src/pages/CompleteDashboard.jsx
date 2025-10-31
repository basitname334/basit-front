import { useEffect, useMemo, useState } from 'react'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function CompleteDashboard({ apiBase }) {
  const headers = useAuthHeaders()
  const [categories, setCategories] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [dishes, setDishes] = useState([])


  const [customers, setCustomers] = useState([])
  const [selectedDishId, setSelectedDishId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [requestedQty, setRequestedQty] = useState('')
  const selectedDish = dishes.find(d => d.id === Number(selectedDishId))
  const baseQty = Number(selectedDish?.base_quantity || 0)
  const baseUnit = selectedDish?.base_unit || ''
  const qty = Number(requestedQty)
  const scaleFactor = baseQty > 0 && qty > 0 ? (qty / baseQty) : null
  const [message, setMessage] = useState('')
  const [overrideMap, setOverrideMap] = useState({}) // ingredient_id -> custom amount

  async function load() {
    const [cRes, iRes, dRes, custRes] = await Promise.all([
      fetch(`${apiBase}/categories`, { headers }),
      fetch(`${apiBase}/ingredients`, { headers }),
      fetch(`${apiBase}/dishes`, { headers }),
      fetch(`${apiBase}/customers`, { headers })
    ])
    const [c, i, d, cust] = await Promise.all([cRes.json(), iRes.json(), dRes.json(), custRes.json()])
    setCategories(c)
    setIngredients(i)
    setDishes(d)
    setCustomers(cust)
    if (d.length && !selectedDishId) setSelectedDishId(d[0].id)
    if (cust.length && !selectedCustomerId) setSelectedCustomerId(cust[0].id)
  }
  useEffect(()=>{ load() },[])


  async function placeOrder() {
    setMessage('')
    if (!selectedDish) { setMessage('Select a dish'); return }
    if (!selectedCustomerId) { setMessage('Select a customer'); return }
    if (!(qty > 0)) { setMessage('Enter a valid quantity'); return }
    const overrides = (selectedDish?.ingredients || []).map(ing => {
      const key = String(ing.ingredient_id || ing.id)
      const val = overrideMap[key]
      const computed = scaleFactor ? ing.amount_per_base * scaleFactor : 0
      const amount = val !== undefined && val !== '' ? Number(val) : Number(computed.toFixed(4))
      return { ingredient_id: ing.ingredient_id, scaled_amount: amount, unit: ing.unit }
    })
    const res = await fetch(`${apiBase}/orders`, { method: 'POST', headers, body: JSON.stringify({ dish_id: Number(selectedDishId), customer_id: Number(selectedCustomerId), requested_quantity: qty, requested_unit: baseUnit, overrides }) })
    const data = await res.json()
    if (!res.ok) { setMessage(data.error || 'Failed'); return }
    setMessage(`Order #${data.id} placed`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="card lg:col-span-2">
        <div className="card-header">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Scale Dish and Preview Ingredients</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select className="input-modern" value={selectedCustomerId} onChange={e=>setSelectedCustomerId(e.target.value)}>
              {customers.map(c=> <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dish</label>
            <select className="input-modern" value={selectedDishId} onChange={e=>setSelectedDishId(e.target.value)}>
              {dishes.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input className="input-modern" type="number" value={requestedQty} onChange={e=>setRequestedQty(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input className="input-modern bg-gray-50" value={baseUnit} readOnly disabled />
          </div>
        </div>
        {selectedDish && (
          <div className="mt-4">
            {scaleFactor && (
              <div className="text-sm text-gray-700 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                Base: {selectedDish.base_quantity} {selectedDish.base_unit} • Scale: ×{Number(scaleFactor.toFixed(4))}
              </div>
            )}
            <div className="table-wrapper">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Amount</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDish.ingredients?.map((ing, idx)=> (
                    <tr key={idx}>
                      <td className="font-medium">{ing.ingredient_name}</td>
                      <td>
                        <input
                          className="input-modern w-full max-w-32"
                          type="number"
                          step="0.01"
                          value={(() => {
                            const key = String(ing.ingredient_id || ing.id)
                            const val = overrideMap[key]
                            if (val !== undefined && val !== '') return val
                            if (scaleFactor) return Number((ing.amount_per_base * scaleFactor).toFixed(4))
                            return ''
                          })()}
                          onChange={e=>{
                            const key = String(ing.ingredient_id || ing.id)
                            setOverrideMap({ ...overrideMap, [key]: e.target.value })
                          }}
                        />
                      </td>
                      <td>{ing.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button onClick={placeOrder} className="btn-primary">
            ✅ Create Order
          </button>
          {message && (
            <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
              ✓ {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



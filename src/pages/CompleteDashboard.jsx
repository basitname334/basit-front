import { useEffect, useMemo, useState } from 'react'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

function getStoredAuth() {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const email = localStorage.getItem('email')
  return token ? { token, role, email } : null
}

export default function CompleteDashboard({ apiBase }) {
  const headers = useAuthHeaders()
  const auth = getStoredAuth()
  const [categories, setCategories] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [dishes, setDishes] = useState([])
  const [customers, setCustomers] = useState([])
  
  // Order details
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  
  // Multiple dishes support
  const [orderDishes, setOrderDishes] = useState([]) // [{ dish_id, quantity }]
  const [showAddDish, setShowAddDish] = useState(false)
  const [newDishId, setNewDishId] = useState('')
  const [newDishQty, setNewDishQty] = useState('')
  
  const [message, setMessage] = useState('')
  
  const selectedCustomer = customers.find(c => c.id === Number(selectedCustomerId))

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
    if (cust.length && !selectedCustomerId) setSelectedCustomerId(cust[0].id)
    
    // Set default dates/times
    if (!bookingDate) {
      const today = new Date()
      setBookingDate(today.toISOString().split('T')[0])
      setBookingTime(today.toTimeString().slice(0, 5))
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      setDeliveryDate(tomorrow.toISOString().split('T')[0])
      setDeliveryTime('12:00')
    }
  }
  useEffect(()=>{ load() },[])

  function addDishToOrder() {
    if (!newDishId) {
      setMessage('Please select a dish')
      return
    }
    if (!newDishQty || Number(newDishQty) <= 0) {
      setMessage('Please enter a valid quantity')
      return
    }
    const dish = dishes.find(d => d.id === Number(newDishId))
    if (!dish) {
      setMessage('Dish not found')
      return
    }
    if (orderDishes.some(od => od.dish_id === Number(newDishId))) {
      setMessage('This dish is already added. Update quantity instead.')
      return
    }
    setOrderDishes([...orderDishes, {
      dish_id: Number(newDishId),
      dish_name: dish.name,
      quantity: Number(newDishQty),
      unit: dish.base_unit
    }])
    setNewDishId('')
    setNewDishQty('')
    setShowAddDish(false)
    setMessage('')
  }

  function removeDishFromOrder(index) {
    setOrderDishes(orderDishes.filter((_, i) => i !== index))
  }

  function updateDishQuantity(index, quantity) {
    const updated = [...orderDishes]
    updated[index].quantity = Number(quantity)
    setOrderDishes(updated)
  }

  async function placeOrder() {
    setMessage('')
    if (!selectedCustomerId) { 
      setMessage('Please select a customer')
      return 
    }
    if (orderDishes.length === 0) { 
      setMessage('Please add at least one dish')
      return 
    }
    if (!bookingDate || !bookingTime) {
      setMessage('Please set booking date and time')
      return
    }
    if (!deliveryDate || !deliveryTime) {
      setMessage('Please set delivery date and time')
      return
    }
    
    try {
      // For now, create one order per dish (or modify API to accept multiple dishes)
      const orderPromises = orderDishes.map(od => {
        const selectedDish = dishes.find(d => d.id === od.dish_id)
        if (!selectedDish) return null
        
        const overrides = (selectedDish.ingredients || []).map(ing => {
          const baseQty = Number(selectedDish.base_quantity || 0)
          const qty = od.quantity
          const scaleFactor = baseQty > 0 && qty > 0 ? (qty / baseQty) : 0
          const computed = scaleFactor ? ing.amount_per_base * scaleFactor : 0
          return { 
            ingredient_id: ing.ingredient_id || ing.id, 
            scaled_amount: Number(computed.toFixed(4)), 
            unit: ing.unit 
          }
        })
        
        return fetch(`${apiBase}/orders`, { 
          method: 'POST', 
          headers, 
          body: JSON.stringify({ 
            dish_id: od.dish_id, 
            customer_id: Number(selectedCustomerId), 
            requested_quantity: od.quantity, 
            requested_unit: od.unit, 
            overrides,
            booking_date: bookingDate,
            booking_time: bookingTime,
            delivery_date: deliveryDate,
            delivery_time: deliveryTime,
            delivery_address: deliveryAddress || selectedCustomer?.address || null
          }) 
        })
      })
      
      const responses = await Promise.all(orderPromises.filter(p => p !== null))
      const results = await Promise.all(responses.map(r => r.json()))
      
      const failed = results.find(r => !r.id)
      if (failed) {
        setMessage(failed.error || 'Some orders failed')
        return
      }
      
      setMessage(`✅ ${results.length} order(s) placed successfully! Order #${results[0].id}`)
      setOrderDishes([])
      setDeliveryAddress('')
    } catch (error) {
      setMessage(error.message || 'Failed to place order')
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">Create Order</h1>
            <p className="text-sm sm:text-base text-indigo-100">Place new orders with multiple dishes</p>
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl">📋</div>
        </div>
      </div>

      {/* User Information */}
      {auth && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 User Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium">
                {auth.email || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Phone</label>
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-500">
                (Not set in profile)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
            <select 
              className="input-modern w-full" 
              value={selectedCustomerId} 
              onChange={e=>setSelectedCustomerId(e.target.value)}
            >
              <option value="">Select Customer...</option>
              {customers.map(c=> (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedCustomer && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-medium">
                  {selectedCustomer.name}
                </div>
              </div>
              {selectedCustomer.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    📞 {selectedCustomer.phone}
                  </div>
                </div>
              )}
              {selectedCustomer.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    ✉️ {selectedCustomer.email}
                  </div>
                </div>
              )}
              {selectedCustomer.address && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                    📍 {selectedCustomer.address}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Booking & Delivery Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Booking & Delivery Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date <span className="text-red-500">*</span></label>
            <input 
              type="date"
              className="input-modern w-full" 
              value={bookingDate} 
              onChange={e=>setBookingDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Time <span className="text-red-500">*</span></label>
            <input 
              type="time"
              className="input-modern w-full" 
              value={bookingTime} 
              onChange={e=>setBookingTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date <span className="text-red-500">*</span></label>
            <input 
              type="date"
              className="input-modern w-full" 
              value={deliveryDate} 
              onChange={e=>setDeliveryDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time <span className="text-red-500">*</span></label>
            <input 
              type="time"
              className="input-modern w-full" 
              value={deliveryTime} 
              onChange={e=>setDeliveryTime(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
            <textarea 
              className="input-modern w-full" 
              rows="2"
              placeholder={selectedCustomer?.address || "Enter delivery address"}
              value={deliveryAddress}
              onChange={e=>setDeliveryAddress(e.target.value)}
            />
            {selectedCustomer?.address && (
              <p className="text-xs text-gray-500 mt-1">Default: {selectedCustomer.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dishes Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🍽️ Order Dishes</h3>
          {!showAddDish && (
            <button 
              onClick={() => setShowAddDish(true)}
              className="btn-success"
            >
              ➕ Add Dish
            </button>
          )}
        </div>

        {showAddDish && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Dish <span className="text-red-500">*</span></label>
                <select
                  className="input-modern w-full"
                  value={newDishId}
                  onChange={e=>setNewDishId(e.target.value)}
                >
                  <option value="">Choose a dish...</option>
                  {dishes
                    .filter(d => !orderDishes.some(od => od.dish_id === d.id))
                    .map(d=> (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.base_quantity} {d.base_unit})
                      </option>
                    ))}
                </select>
              </div>
              {newDishId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input-modern w-full"
                      placeholder="Enter quantity"
                      value={newDishQty}
                      onChange={e=>setNewDishQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <input
                      className="input-modern w-full bg-gray-50"
                      value={dishes.find(d => d.id === Number(newDishId))?.base_unit || ''}
                      readOnly
                      disabled
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addDishToOrder}
                className="btn-success"
                disabled={!newDishId || !newDishQty || Number(newDishQty) <= 0}
              >
                ✅ Add to Order
              </button>
              <button
                onClick={() => {
                  setShowAddDish(false)
                  setNewDishId('')
                  setNewDishQty('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {orderDishes.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <span className="text-4xl mb-2 block">🍽️</span>
            <p className="text-gray-500 font-medium">No dishes added yet</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Dish" to start building your order</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderDishes.map((od, index) => {
              const dish = dishes.find(d => d.id === od.dish_id)
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Dish</label>
                      <div className="font-semibold text-gray-900">{od.dish_name}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input-modern w-full"
                        value={od.quantity}
                        onChange={e=>updateDishQuantity(index, e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Unit</label>
                      <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700">
                        {od.unit}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDishFromOrder(index)}
                    className="btn-danger ml-4"
                    title="Remove dish"
                  >
                    🗑️
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Order Button */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button 
            onClick={placeOrder} 
            className="btn-primary w-full sm:w-auto"
            disabled={!selectedCustomerId || orderDishes.length === 0 || !bookingDate || !bookingTime || !deliveryDate || !deliveryTime}
          >
            ✅ Create Order
          </button>
          {message && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium flex-1 ${
              message.includes('✅') || message.includes('successfully')
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



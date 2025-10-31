import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'

function useAuthHeaders() {
  const token = localStorage.getItem('token')
  return useMemo(()=>({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }),[token])
}

export default function AdminDashboard({ apiBase }) {
  const { t } = useI18n()
  const headers = useAuthHeaders()
  const [categories, setCategories] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [dishes, setDishes] = useState([])
  const [customers, setCustomers] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newIng, setNewIng] = useState({ name: '', category_id: '' })
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [newDish, setNewDish] = useState({ name: '', base_quantity: '', base_unit: '', price_per_base: '', cost_per_base: '' })
  const [dishIngs, setDishIngs] = useState([]) // { ingredient_id, amount_per_base, unit }
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('')
  const [showIngredientSelector, setShowIngredientSelector] = useState(false)
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(null)
  const [selectedIngredientForAdd, setSelectedIngredientForAdd] = useState(null)
  const [ingredientAmount, setIngredientAmount] = useState('')
  const [ingredientUnit, setIngredientUnit] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    categories: false,
    ingredients: false,
    customers: false,
    dishes: false
  })

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
  }
  useEffect(()=>{ load() },[])

  function showMessage(type, text) {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  async function addCategory() {
    if (!newCategory.trim()) return
    try {
      const res = await fetch(`${apiBase}/categories`, { method: 'POST', headers, body: JSON.stringify({ name: newCategory.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showMessage('success', t('categoryCreated'))
      setNewCategory('')
      load()
    } catch (error) {
      showMessage('error', error.message || t('failedToCreate'))
    }
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return
    try {
      const res = await fetch(`${apiBase}/categories/${id}`, { method: 'DELETE', headers })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      showMessage('success', t('categoryDeleted'))
      load()
    } catch (error) {
      showMessage('error', error.message || t('failedToDelete'))
    }
  }

  async function addIngredient() {
    if (!newIng.name || !newIng.category_id) {
      showMessage('error', t('pleaseFillAllFields'))
      return
    }
    try {
      const res = await fetch(`${apiBase}/ingredients`, { method: 'POST', headers, body: JSON.stringify({ name: newIng.name.trim(), category_id: Number(newIng.category_id) }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showMessage('success', t('ingredientCreated'))
      setNewIng({ name: '', category_id: '' })
      load()
    } catch (error) {
      showMessage('error', error.message || t('failedToCreate'))
    }
  }

  async function deleteIngredient(id) {
    if (!confirm('Delete this ingredient?')) return
    try {
      await fetch(`${apiBase}/ingredients/${id}`, { method: 'DELETE', headers })
      showMessage('success', t('ingredientDeleted'))
      load()
    } catch (error) {
      showMessage('error', t('failedToDelete'))
    }
  }

  async function addCustomer() {
    if (!newCustomer.name.trim()) {
      showMessage('error', 'Customer name is required')
      return
    }
    try {
      const res = await fetch(`${apiBase}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newCustomer.name.trim(),
          phone: newCustomer.phone?.trim() || null,
          email: newCustomer.email?.trim() || null,
          address: newCustomer.address?.trim() || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showMessage('success', 'Customer added successfully')
      setNewCustomer({ name: '', phone: '', email: '', address: '' })
      load()
    } catch (error) {
      showMessage('error', error.message || 'Failed to add customer')
    }
  }

  async function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return
    try {
      const res = await fetch(`${apiBase}/customers/${id}`, { method: 'DELETE', headers })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      showMessage('success', 'Customer deleted successfully')
      load()
    } catch (error) {
      showMessage('error', error.message || 'Failed to delete customer')
    }
  }

  function toggleSection(section) {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  function addIngredientToDish() {
    if (!selectedIngredientForAdd || !ingredientAmount || !ingredientUnit) {
      showMessage('error', t('pleaseFillIngredientFields'))
      return
    }
    if (dishIngs.some(di => di.ingredient_id === selectedIngredientForAdd.id)) {
      showMessage('error', 'This ingredient is already added')
      return
    }
    setDishIngs([...dishIngs, {
      ingredient_id: selectedIngredientForAdd.id,
      amount_per_base: Number(ingredientAmount),
      unit: ingredientUnit
    }])
    setSelectedIngredientForAdd(null)
    setIngredientAmount('')
    setIngredientUnit('')
    setShowIngredientSelector(false)
    showMessage('success', t('ingredientAdded'))
  }

  function removeIngredientFromDish(index) {
    setDishIngs(dishIngs.filter((_, i) => i !== index))
  }

  async function createDish() {
    if (!newDish.name.trim()) {
      showMessage('error', t('pleaseFillAllFields'))
      return
    }
    if (!newDish.base_quantity || !newDish.base_unit) {
      showMessage('error', t('pleaseFillAllFields'))
      return
    }
    if (dishIngs.length === 0) {
      showMessage('error', t('pleaseAddIngredient'))
      return
    }
    try {
      const res = await fetch(`${apiBase}/dishes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newDish.name.trim(),
          base_quantity: Number(newDish.base_quantity),
          base_unit: newDish.base_unit.trim(),
          price_per_base: newDish.price_per_base ? Number(newDish.price_per_base) : null,
          cost_per_base: newDish.cost_per_base ? Number(newDish.cost_per_base) : null,
          ingredients: dishIngs
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showMessage('success', t('dishCreated'))
      setNewDish({ name: '', base_quantity: '', base_unit: '', price_per_base: '', cost_per_base: '' })
      setDishIngs([])
      load()
    } catch (error) {
      showMessage('error', error.message || t('failedToCreate'))
    }
  }

  async function deleteDish(id){
    if (!confirm(t('sureDeleteDish'))) return
    try {
      await fetch(`${apiBase}/dishes/${id}`, { method: 'DELETE', headers })
      showMessage('success', t('dishDeleted'))
      load()
    } catch (error) {
      showMessage('error', t('failedToDeleteDish'))
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">{t('adminDashboard')}</h1>
            <p className="text-sm sm:text-base text-blue-100">{t('adminSubtitle')}</p>
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl">👨‍💼</div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message.text && (
        <div className={`p-4 rounded-lg border-l-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-400 text-green-800' 
            : 'bg-red-50 border-red-400 text-red-800'
        }`}>
          <strong>{message.type === 'success' ? `✓ ${t('success')}:` : `✗ ${t('error')}:`}</strong> {message.text}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="text-sm text-purple-700 font-medium mb-1">📁 Categories</div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-900">{categories.length}</div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-sm text-green-700 font-medium mb-1">🥬 Ingredients</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-900">{ingredients.length}</div>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="text-sm text-orange-700 font-medium mb-1">👥 Customers</div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-900">{customers.length}</div>
        </div>
        <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <div className="text-sm text-indigo-700 font-medium mb-1">🍽️ Dishes</div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-900">{dishes.length}</div>
        </div>
      </div>

      {/* Manage Categories Section */}
      <div className="card">
        <div 
          className="card-header cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors"
          onClick={() => toggleSection('categories')}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📁</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Categories</h2>
              <p className="text-xs sm:text-sm text-gray-500">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            {expandedSections.categories ? '▼' : '▶'}
          </button>
        </div>

        {expandedSections.categories && (
          <>
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  placeholder="Category name (e.g., Grains, Vegetables, Spices)" 
                  className="input-modern flex-1" 
                  value={newCategory} 
                  onChange={e=>setNewCategory(e.target.value)} 
                  onKeyPress={e=>{ if(e.key === 'Enter') addCategory() }}
                />
                <button 
                  onClick={addCategory} 
                  className="btn-success whitespace-nowrap"
                >
                  ➕ Add
                </button>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📁</span>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{cat.name}</div>
                        <div className="text-xs text-gray-500">
                          {ingredients.filter(i => i.category_id === cat.id || i.category_name === cat.name).length} ingredient(s)
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={()=>deleteCategory(cat.id)} 
                      className="btn-danger text-xs"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Manage Ingredients Section */}
      <div className="card">
        <div 
          className="card-header cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors"
          onClick={() => toggleSection('ingredients')}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🥬</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('manageIngredients')}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{ingredients.length} {ingredients.length === 1 ? t('singleIngredient') : t('multipleIngredients')}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            {expandedSections.ingredients ? '▼' : '▶'}
          </button>
        </div>

        {expandedSections.ingredients && (
          <>
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input 
                  placeholder={t('ingredientNamePlaceholder')} 
                  className="input-modern md:col-span-2" 
                  value={newIng.name} 
                  onChange={e=>setNewIng({...newIng,name:e.target.value})} 
                />
                <select 
                  className="input-modern" 
                  value={newIng.category_id} 
                  onChange={e=>setNewIng({...newIng,category_id:e.target.value})}
                >
                  <option value="">Category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={addIngredient} 
                className="btn-success"
                disabled={categories.length === 0}
              >
                ➕ {t('addIngredient')}
              </button>
              {categories.length === 0 && (
                <p className="text-xs text-red-600 mt-2">⚠️ Add categories first</p>
              )}
            </div>

            {ingredients.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ingredients.map(ing => (
                  <div key={ing.id} className="flex justify-between items-center border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍽️</span>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{ing.name}</div>
                        <div className="text-xs text-gray-500">Category: {ing.category_name || 'N/A'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={()=>deleteIngredient(ing.id)} 
                      className="btn-danger text-xs"
                      title={t('delete')}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Manage Customers Section */}
      <div className="card">
        <div 
          className="card-header cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors"
          onClick={() => toggleSection('customers')}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Customers</h2>
              <p className="text-xs sm:text-sm text-gray-500">{customers.length} {customers.length === 1 ? 'customer' : 'customers'}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            {expandedSections.customers ? '▼' : '▶'}
          </button>
        </div>

        {expandedSections.customers && (
          <>
            <div className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input 
                  placeholder="Customer Name *" 
                  className="input-modern"
                  value={newCustomer.name}
                  onChange={e=>setNewCustomer({...newCustomer,name:e.target.value})}
                />
                <input 
                  placeholder="Phone Number"
                  className="input-modern"
                  value={newCustomer.phone}
                  onChange={e=>setNewCustomer({...newCustomer,phone:e.target.value})}
                />
                <input 
                  placeholder="Email Address"
                  className="input-modern"
                  value={newCustomer.email}
                  onChange={e=>setNewCustomer({...newCustomer,email:e.target.value})}
                />
                <input 
                  placeholder="Address"
                  className="input-modern"
                  value={newCustomer.address}
                  onChange={e=>setNewCustomer({...newCustomer,address:e.target.value})}
                />
              </div>
              <button 
                onClick={addCustomer} 
                className="btn-success"
              >
                ➕ Add Customer
              </button>
            </div>

            {customers.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {customers.map(customer => (
                  <div key={customer.id} className="flex justify-between items-start border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start gap-2 flex-1">
                      <span className="text-lg">👤</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-gray-500 truncate">📞 {customer.phone}</div>
                        )}
                        {customer.email && (
                          <div className="text-xs text-gray-500 truncate">✉️ {customer.email}</div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={()=>deleteCustomer(customer.id)} 
                      className="btn-danger text-xs ml-2"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dish Section */}
      <div className="card">
        <div 
          className="card-header cursor-pointer hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors"
          onClick={() => toggleSection('dishes')}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🍽️</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('createDish')}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{t('defineDishes')}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            {expandedSections.dishes ? '▼' : '▶'}
          </button>
        </div>

        {expandedSections.dishes && (
          <>
            {ingredients.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                ⚠️ {t('addIngredientsFirst')}
              </div>
            ) : (
              <>
                <div className="mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('dishName')}</label>
                      <input
                        type="text"
                        placeholder={t('dishNamePlaceholder')}
                        className="input-modern w-full"
                        value={newDish.name}
                        onChange={e => setNewDish({...newDish, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('baseUnit')}</label>
                      <input
                        type="text"
                        placeholder={t('baseUnitPlaceholder')}
                        className="input-modern w-full"
                        value={newDish.base_unit}
                        onChange={e => setNewDish({...newDish, base_unit: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('baseQuantity')}</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={t('baseQuantityPlaceholder')}
                        className="input-modern w-full"
                        value={newDish.base_quantity}
                        onChange={e => setNewDish({...newDish, base_quantity: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">{t('baseQuantityDesc')}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{t('dishIngredients')}</h3>
                    {!showIngredientSelector && (
                      <button
                        onClick={() => setShowIngredientSelector(true)}
                        className="btn-success text-sm"
                      >
                        ➕ {t('addIngredientToDish')}
                      </button>
                    )}
                  </div>

                  {showIngredientSelector && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectIngredient')}</label>
                          <select
                            className="input-modern w-full"
                            value={selectedIngredientForAdd?.id || ''}
                            onChange={e => {
                              const ing = ingredients.find(i => i.id === Number(e.target.value))
                              setSelectedIngredientForAdd(ing || null)
                              if (ing) {
                                setIngredientUnit(ing.unit || '')
                              }
                            }}
                          >
                            <option value="">{t('selectIngredient')}</option>
                            {ingredients
                              .filter(ing => !dishIngs.some(di => di.ingredient_id === ing.id))
                              .map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name}</option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('amountPerBase')}</label>
                          <input
                            type="number"
                            step="0.001"
                            placeholder={t('amountPerBasePlaceholder')}
                            className="input-modern w-full"
                            value={ingredientAmount}
                            onChange={e => setIngredientAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                          <input
                            type="text"
                            className="input-modern w-full"
                            value={ingredientUnit}
                            onChange={e => setIngredientUnit(e.target.value)}
                            placeholder="e.g., kg, g, litre"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addIngredientToDish}
                          className="btn-success"
                          disabled={!selectedIngredientForAdd || !ingredientAmount || !ingredientUnit}
                        >
                          ✅ Add
                        </button>
                        <button
                          onClick={() => {
                            setShowIngredientSelector(false)
                            setSelectedIngredientForAdd(null)
                            setIngredientAmount('')
                            setIngredientUnit('')
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {dishIngs.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-500">{t('noIngredientsAddedToDish')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dishIngs.map((di, idx) => {
                        const ing = ingredients.find(i => i.id === di.ingredient_id)
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">🥄</span>
                              <div>
                                <div className="font-medium text-gray-900">{ing?.name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">
                                  {di.amount_per_base} {di.unit} {t('perBase')}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeIngredientFromDish(idx)}
                              className="btn-danger text-xs"
                              title="Remove"
                            >
                              🗑️
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <button
                    onClick={createDish}
                    className="btn-primary w-full sm:w-auto"
                    disabled={!newDish.name || !newDish.base_quantity || !newDish.base_unit || dishIngs.length === 0}
                  >
                    ✅ {t('createDishButton')}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Dishes List */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🍽️</span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('allDishes')}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{dishes.length} {dishes.length === 1 ? t('singleDish') : t('multipleDishes')}</p>
            </div>
          </div>
          <span className="badge badge-info">{dishes.length}</span>
        </div>

        {dishes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <span className="text-5xl mb-3 block">🍽️</span>
            <p className="text-gray-500 font-medium">{t('noDishesYet')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('createFirstDish')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dishes.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{d.name}</h3>
                    <div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded">
                      {t('baseQuantity')}: {d.base_quantity} {d.base_unit}
                    </div>
                  </div>
                  <button 
                    onClick={()=>deleteDish(d.id)} 
                    className="btn-danger ml-2"
                    title={t('delete') + ' ' + t('singleDish')}
                  >
                    🗑️
                  </button>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{t('ingredients')}</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {d.ingredients.length === 0 ? (
                      <li className="text-xs text-gray-400 italic">{t('noIngredients')}</li>
                    ) : (
                      d.ingredients.map(i => (
                        <li key={i.id} className="text-xs text-gray-700 flex items-center gap-2">
                          <span className="text-blue-600">•</span>
                          <span className="font-medium">{i.ingredient_name}:</span>
                          <span>{i.amount_per_base} {i.unit}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { useI18n } from './i18n.jsx'
import Login from './pages/Login.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import CompleteDashboard from './pages/CompleteDashboard.jsx'
import Orders from './pages/Orders.jsx'
import PrintIngredientSlip from './pages/PrintIngredientSlip.jsx'
import PrintOrderSlip from './pages/PrintOrderSlip.jsx'
import Reports from './pages/Reports.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getStoredAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const email = localStorage.getItem('email');
  return token ? { token, role, email } : null;
}

function setStoredAuth(auth) {
  if (!auth) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
  } else {
    localStorage.setItem('token', auth.token);
    localStorage.setItem('role', auth.role);
    localStorage.setItem('email', auth.email);
  }
}

function Protected({ role, children }) {
  const auth = getStoredAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const auth = getStoredAuth();
  const { lang, setLang, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logout = () => { setStoredAuth(null); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="no-print bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4 sm:gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <span className="text-xl sm:text-2xl text-white">🍽️</span>
                </div>
                <span className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900 hidden sm:block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('brand')}
                </span>
              </Link>
              
              {auth?.role === 'admin' && (
                <nav className="hidden lg:flex items-center gap-1">
                  <Link 
                    to="/admin" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">👨‍💼 {t('admin')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">📊 {t('dashboard')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                  <Link 
                    to="/orders" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">📋 {t('orders')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                  <Link 
                    to="/reports" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">💹 {t('reports')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                </nav>
              )}
              
              {auth?.role === 'user' && (
                <nav className="hidden lg:flex items-center gap-1">
                  <Link 
                    to="/user" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">🛒 {t('newOrder')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">📊 {t('dashboard')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                  <Link 
                    to="/orders" 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 relative group"
                  >
                    <span className="relative z-10">📋 {t('orders')}</span>
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </Link>
                </nav>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Menu Button */}
              {auth && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
              
              {auth && (
                <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-full font-medium shadow-sm">
                    {auth.role === 'admin' ? '👨‍💼' : '👤'} <span className="hidden md:inline">{auth.email}</span>
                  </span>
                </div>
              )}
              {auth ? (
                <button 
                  onClick={logout} 
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 border border-red-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="hidden sm:inline">🚪 </span>{t('logout')}
                </button>
              ) : (
                <Link 
                  to="/login" 
                  className="btn-primary text-xs sm:text-sm px-4 sm:px-6"
                >
                  {t('signIn')}
                </Link>
              )}
              <div className="hidden sm:flex items-center gap-2">
                <select 
                  className="border-2 border-gray-200 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={lang}
                  onChange={e=>setLang(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="ur">اردو</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Mobile Menu */}
        {auth && mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm">
            <div className="px-4 py-3 space-y-1">
              {auth.role === 'admin' && (
                <>
                  <Link 
                    to="/admin" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">👨‍💼</span> {t('admin')}
                  </Link>
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">📊</span> {t('dashboard')}
                  </Link>
                  <Link 
                    to="/orders" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">📋</span> {t('orders')}
                  </Link>
                  <Link 
                    to="/reports" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">💹</span> {t('reports')}
                  </Link>
                </>
              )}
              {auth.role === 'user' && (
                <>
                  <Link 
                    to="/user" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">🛒</span> {t('newOrder')}
                  </Link>
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">📊</span> {t('dashboard')}
                  </Link>
                  <Link 
                    to="/orders" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200"
                  >
                    <span className="text-xl">📋</span> {t('orders')}
                  </Link>
                </>
              )}
              <div className="pt-2 mt-2 border-t border-gray-200">
                <div className="px-4 py-2 text-xs text-gray-500">
                  {auth.role === 'admin' ? '👨‍💼' : '👤'} {auth.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="container-responsive py-4 sm:py-6 lg:py-8">
        <Routes>
          <Route path="/login" element={<Login apiBase={API_BASE} onLogin={(a) => { setStoredAuth(a); navigate('/'); }} />} />
          <Route path="/admin" element={<Protected role="admin"><AdminDashboard apiBase={API_BASE} /></Protected>} />
          <Route path="/user" element={<Protected role="user"><UserDashboard apiBase={API_BASE} /></Protected>} />
          <Route path="/orders" element={<Protected><Orders apiBase={API_BASE} /></Protected>} />
          <Route path="/reports" element={<Protected role="admin"><Reports apiBase={API_BASE} /></Protected>} />
          <Route path="/dashboard" element={<Protected><CompleteDashboard apiBase={API_BASE} /></Protected>} />
          <Route path="/orders/:id/ingredient-slip" element={<Protected><PrintIngredientSlip apiBase={API_BASE} /></Protected>} />
          <Route path="/orders/:id/order-slip" element={<Protected><PrintOrderSlip apiBase={API_BASE} /></Protected>} />
          <Route path="/" element={auth ? <Navigate to={auth.role === 'admin' ? '/admin' : '/user'} replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  );
}



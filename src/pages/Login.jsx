import { useState } from 'react'
import { useI18n } from '../i18n.jsx'

export default function Login({ apiBase, onLogin }) {
  const { t, lang, setLang } = useI18n()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      onLogin({ token: data.token, role: data.user.role, email: data.user.email })
    } catch (err) { 
      setError(err.message) 
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl mb-4 sm:mb-6 transform hover:scale-105 transition-transform">
            <span className="text-3xl sm:text-4xl text-white">🍽️</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('brand')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">{t('signInTitle')}</p>
          <div className="mt-4 sm:mt-6">
            <select 
              className="border-2 border-gray-200 px-3 py-2 rounded-xl text-sm bg-white shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={lang} 
              onChange={e=>setLang(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ur">اردو</option>
            </select>
          </div>
        </div>
        
        <div className="card shadow-2xl">
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm shadow-sm">
              <strong className="font-semibold">⚠️ Error:</strong> {error}
            </div>
          )}
          
          <form onSubmit={submit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('email')}</label>
              <input 
                type="email"
                className="input-modern text-base" 
                value={email} 
                onChange={e=>setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('password')}</label>
              <input 
                type="password" 
                className="input-modern text-base" 
                value={password} 
                onChange={e=>setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            
            <button 
              type="submit"
              className="btn-primary w-full text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('signIn')}...
                </span>
              ) : t('signIn')}
            </button>
          </form>
          
          <div className="mt-6 sm:mt-8 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
            <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-2 sm:mb-3">🧪 {t('testCredentials')}:</p>
            <div className="text-xs sm:text-sm text-blue-800 space-y-1.5">
              <p><strong>Admin:</strong> admin@example.com / admin123</p>
              <p><strong>User:</strong> user@example.com / user123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { I18nProvider } from './i18n.jsx'

const router = createBrowserRouter([
  { path: '/*', element: <App /> },
], {
  future: { v7_startTransition: true, v7_relativeSplatPath: true }
})

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
)



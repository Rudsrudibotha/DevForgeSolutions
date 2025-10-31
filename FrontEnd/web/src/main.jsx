import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  )
} catch (error) {
  console.error('Application initialization failed:', error?.message || 'Unknown error')
  const errorDiv = document.createElement('div')
  errorDiv.style.cssText = 'padding: 20px; color: red; text-align: center; font-family: Arial, sans-serif;'
  errorDiv.innerHTML = '<h2>Failed to load application</h2><p>Please refresh the page to try again.</p>'
  document.body.appendChild(errorDiv)
}
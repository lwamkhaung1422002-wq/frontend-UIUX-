import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/noto-sans-myanmar/400.css'
import '@fontsource/noto-sans-myanmar/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/700.css'
import './styles/tokens.css'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { useGLTF } from '@react-three/drei'
import App from './App'
import './styles.css'

// Serve the Draco decoder locally (no CDN dependency)
useGLTF.setDecoderPath('/draco/')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

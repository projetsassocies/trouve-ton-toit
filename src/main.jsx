import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;font-family:system-ui;color:red;">Erreur: élément #root introuvable.</div>'
} else {
  try {
    ReactDOM.createRoot(rootEl).render(<App />)
  } catch (err) {
    rootEl.innerHTML = `
      <div style="padding:24px;font-family:system-ui;max-width:500px;">
        <h2 style="color:#dc2626;margin-bottom:8px;">Erreur au chargement</h2>
        <pre style="background:#f5f5f5;padding:12px;border-radius:8px;overflow:auto;font-size:12px;">${err?.message || String(err)}</pre>
        <p style="color:#666;font-size:14px;margin-top:12px;">Ouvrez la console (F12) pour plus de détails.</p>
        <button onclick="location.reload()" style="margin-top:12px;padding:8px 16px;background:#000;color:#fff;border:none;border-radius:8px;cursor:pointer;">Recharger</button>
      </div>
    `
    console.error('React mount error:', err)
  }
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}




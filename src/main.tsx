import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './vybe-next/App';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('[VYBE] Offline shell registration failed', error);
    });
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('VYBE root element was not found.');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

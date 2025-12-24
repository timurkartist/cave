
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Expand Telegram Mini App to fullscreen
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.expand();
}

const root = ReactDOM.createRoot(rootElement);
// Убираем React.StrictMode в development чтобы не было двойных подключений
root.render(<App />);

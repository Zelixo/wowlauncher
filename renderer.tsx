/// <reference path="index.css.d.ts" />
/// <reference path="types.d.ts" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('Renderer starting...');
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('Root element found, rendering App...');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Failed to find the root element');
}

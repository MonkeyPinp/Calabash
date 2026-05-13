import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

function resolveInitialTheme(): 'light' | 'dark' {
  const preference = localStorage.getItem('calabash-theme-preference')
    ?? localStorage.getItem('calabash-theme')
    ?? 'light';
  if (preference === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference === 'dark' ? 'dark' : 'light';
}

document.documentElement.setAttribute('data-theme', resolveInitialTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

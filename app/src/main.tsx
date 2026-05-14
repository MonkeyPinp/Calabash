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

function resolveInitialLanguage(): 'en' | 'zh-CN' | 'es' | 'pt-BR' {
  const preference = localStorage.getItem('calabash-language') ?? 'system';
  const locale = preference === 'system' ? navigator.language.toLowerCase() : preference.toLowerCase();
  if (locale.startsWith('zh')) return 'zh-CN';
  if (locale.startsWith('es')) return 'es';
  if (locale.startsWith('pt')) return 'pt-BR';
  return 'en';
}

document.documentElement.setAttribute('data-theme', resolveInitialTheme());
document.documentElement.setAttribute('lang', resolveInitialLanguage());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

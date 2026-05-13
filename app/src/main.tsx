import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const saved = localStorage.getItem('calabash-theme') ?? 'light';
document.documentElement.setAttribute('data-theme', saved);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

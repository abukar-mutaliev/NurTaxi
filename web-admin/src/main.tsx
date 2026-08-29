import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/app/styles/global.css';
import { App } from '@/app/App';

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

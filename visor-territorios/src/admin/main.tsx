import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './admin.css';
import AdminDashboard from './AdminDashboard';
import { ModalProvider } from '../context/ModalContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento root no encontrado en el DOM de dt.html');

createRoot(rootElement).render(
  <StrictMode>
    <ModalProvider>
      <AdminDashboard />
    </ModalProvider>
  </StrictMode>
);

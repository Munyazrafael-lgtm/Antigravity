import { useContext } from 'react';
import { ModalContext, type ModalContextType } from '../context/ModalContext';

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal debe utilizarse dentro de un ModalProvider');
  }
  return context;
};

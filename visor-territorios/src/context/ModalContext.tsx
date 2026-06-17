import React, { createContext, useState, useCallback } from 'react';

type DialogType = 'alert' | 'confirm';

interface DialogOptions {
  title?: string;
  message: string;
  type: DialogType;
  resolve: (value: boolean) => void;
}

export interface ModalContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  const showAlert = useCallback((message: string, title = 'Aviso'): Promise<void> => {
    return new Promise<void>((resolve) => {
      setDialog({
        title,
        message,
        type: 'alert',
        resolve: () => resolve(),
      });
    });
  }, []);

  const showConfirm = useCallback((message: string, title = 'Confirmar'): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        title,
        message,
        type: 'confirm',
        resolve,
      });
    });
  }, []);

  const handleClose = (value: boolean) => {
    if (dialog) {
      dialog.resolve(value);
      setDialog(null);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && (
        <div className="dialog-overlay" onClick={() => dialog.type === 'alert' && handleClose(true)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            {dialog.title && <div className="dialog-title">{dialog.title}</div>}
            <div className="dialog-message">{dialog.message}</div>
            <div className="dialog-actions">
              {dialog.type === 'confirm' && (
                <button className="dialog-btn dialog-btn-cancel" onClick={() => handleClose(false)}>
                  Cancelar
                </button>
              )}
              <button className="dialog-btn dialog-btn-confirm" onClick={() => handleClose(true)}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

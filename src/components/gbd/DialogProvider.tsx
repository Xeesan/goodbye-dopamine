import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

type DialogType = 'confirm' | 'alert' | 'success' | 'info';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
};

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<(DialogOptions & { resolve: (v: boolean) => void }) | null>(null);

  const showDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const iconMap = {
    confirm: <AlertTriangle className="w-6 h-6" style={{ color: 'hsl(var(--warning))' }} />,
    alert: <Info className="w-6 h-6 text-destructive" />,
    success: <CheckCircle className="w-6 h-6 text-primary" />,
    info: <Info className="w-6 h-6 text-primary" />,
  };

  const type = dialog?.type || 'confirm';

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => handleClose(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]" />

          {/* Dialog Card */}
          <div
            className="relative w-full max-w-[380px] rounded-xl overflow-hidden animate-[slideUp_0.2s_ease]"
            style={{
              background: 'hsl(var(--bg-card))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header accent line */}
            <div className="h-1" style={{
              background: type === 'confirm'
                ? 'hsl(var(--warning))'
                : type === 'alert'
                ? 'hsl(var(--destructive))'
                : 'hsl(var(--primary))',
            }} />

            <div className="p-6">
              {/* Icon + Close */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
                  background: type === 'confirm'
                    ? 'hsl(var(--warning) / 0.12)'
                    : type === 'alert'
                    ? 'hsl(var(--destructive) / 0.12)'
                    : 'hsl(var(--primary) / 0.12)',
                }}>
                  {iconMap[type]}
                </div>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  style={{ background: 'hsl(var(--bg-input))' }}
                  onClick={() => handleClose(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2">{dialog.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground mb-6">{dialog.message}</p>

              {/* Actions */}
              <div className="flex gap-3">
                {type === 'confirm' ? (
                  <>
                    <button
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: 'hsl(var(--bg-input))',
                        color: 'hsl(var(--text-secondary))',
                        border: '1px solid hsl(var(--border))',
                      }}
                      onClick={() => handleClose(false)}
                    >
                      {dialog.cancelText || 'Cancel'}
                    </button>
                    <button
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                      style={{
                        background: 'hsl(var(--destructive))',
                        color: '#fff',
                      }}
                      onClick={() => handleClose(true)}
                    >
                      {dialog.confirmText || 'Confirm'}
                    </button>
                  </>
                ) : (
                  <button
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{
                      background: type === 'success' ? 'hsl(var(--primary))' : type === 'alert' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                      color: '#fff',
                    }}
                    onClick={() => handleClose(true)}
                  >
                    {dialog.confirmText || 'OK'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

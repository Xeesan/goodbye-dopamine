import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

type DialogType = 'confirm' | 'alert' | 'success' | 'info' | 'prompt';

interface DialogOptions {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => Promise<boolean>;
  showPrompt: (options: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
};

interface InternalDialog extends DialogOptions {
  resolve: (v: any) => void;
}

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<InternalDialog | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const showDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const showPrompt = useCallback((options: DialogOptions): Promise<string | null> => {
    return new Promise(resolve => {
      setInputValue(options.defaultValue || '');
      setDialog({ ...options, type: 'prompt', resolve });
    });
  }, []);

  useEffect(() => {
    if (dialog?.type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [dialog]);

  const handleClose = (result: any) => {
    dialog?.resolve(result);
    setDialog(null);
    setInputValue('');
  };

  const iconMap = {
    confirm: <AlertTriangle className="w-6 h-6" style={{ color: 'hsl(var(--warning))' }} />,
    alert: <Info className="w-6 h-6 text-destructive" />,
    success: <CheckCircle className="w-6 h-6 text-primary" />,
    info: <Info className="w-6 h-6 text-primary" />,
    prompt: <Info className="w-6 h-6 text-primary" />,
  };

  const type = dialog?.type || 'confirm';

  return (
    <DialogContext.Provider value={{ showDialog, showPrompt }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => handleClose(type === 'prompt' ? null : false)}>
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
                  onClick={() => handleClose(type === 'prompt' ? null : false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-foreground mb-2">{dialog.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">{dialog.message}</p>

              {/* Prompt Input */}
              {type === 'prompt' && (
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleClose(inputValue); }}
                  placeholder={dialog.placeholder || ''}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground mb-4 outline-none transition-colors"
                  style={{
                    background: 'hsl(var(--bg-input))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {(type === 'confirm' || type === 'prompt') ? (
                  <>
                    <button
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: 'hsl(var(--bg-input))',
                        color: 'hsl(var(--text-secondary))',
                        border: '1px solid hsl(var(--border))',
                      }}
                      onClick={() => handleClose(type === 'prompt' ? null : false)}
                    >
                      {dialog.cancelText || 'Cancel'}
                    </button>
                    <button
                      className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                      style={{
                        background: type === 'prompt' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))',
                        color: '#fff',
                      }}
                      onClick={() => handleClose(type === 'prompt' ? inputValue : true)}
                    >
                      {dialog.confirmText || 'OK'}
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

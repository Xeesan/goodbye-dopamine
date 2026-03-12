import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { Calendar, Clock, FileText, Monitor, Wallet, StickyNote, BookOpen, Timer, BarChart3, type LucideIcon } from 'lucide-react';

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

export interface TileOption {
  id: string;
  name: string;
  icon: LucideIcon;
  tokenColor: string;
}

interface DialogContextType {
  showDialog: (options: DialogOptions) => Promise<boolean>;
  showPrompt: (options: DialogOptions) => Promise<string | null>;
  showTileCustomizer: (tiles: TileOption[], enabledIds: string[]) => Promise<string[] | null>;
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

  // Tile customizer state
  const [tileDialog, setTileDialog] = useState<{ tiles: TileOption[]; enabled: string[]; resolve: (v: string[] | null) => void } | null>(null);
  const [tileEnabled, setTileEnabled] = useState<string[]>([]);

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

  const showTileCustomizer = useCallback((tiles: TileOption[], enabledIds: string[]): Promise<string[] | null> => {
    return new Promise(resolve => {
      setTileEnabled([...enabledIds]);
      setTileDialog({ tiles, enabled: enabledIds, resolve });
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

  const handleTileClose = (save: boolean) => {
    tileDialog?.resolve(save ? tileEnabled : null);
    setTileDialog(null);
    setTileEnabled([]);
  };

  const toggleTile = (id: string) => {
    setTileEnabled(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
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
    <DialogContext.Provider value={{ showDialog, showPrompt, showTileCustomizer }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => handleClose(type === 'prompt' ? null : false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 animate-[fadeIn_0.15s_ease]" />

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

      {/* Tile Customizer Dialog */}
      {tileDialog && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => handleTileClose(false)}>
          <div className="absolute inset-0 bg-black/70 animate-[fadeIn_0.15s_ease]" />
          <div
            className="relative w-full sm:max-w-[360px] max-h-[85vh] sm:max-h-[80vh] rounded-t-xl sm:rounded-xl overflow-hidden animate-[slideUpSheet_0.35s_cubic-bezier(0.32,0.72,0,1)] sm:animate-[slideUp_0.2s_ease] flex flex-col"
            style={{
              background: 'hsl(var(--bg-card))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1 shrink-0" style={{ background: 'hsl(var(--primary))' }} />
            <div className="p-5 sm:p-6 flex flex-col min-h-0">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Customize Quick Tiles</h3>
              <p className="text-sm text-muted-foreground mb-4">Toggle which tiles appear on your dashboard</p>

              <div className="flex flex-col gap-1 overflow-y-auto flex-1 -mx-2 px-2">
                {tileDialog.tiles.map(tile => {
                  const Icon = tile.icon;
                  const isOn = tileEnabled.includes(tile.id);
                  return (
                    <button
                      key={tile.id}
                      className="flex items-center gap-3 px-3 py-3.5 rounded-lg transition-colors hover:bg-accent/30"
                      onClick={() => toggleTile(tile.id)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: `hsl(${tile.tokenColor} / 0.12)`,
                          color: `hsl(${tile.tokenColor})`,
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-foreground">{tile.name}</span>
                      {/* Toggle switch */}
                      <div
                        className="w-12 h-7 rounded-full p-0.5 transition-colors duration-200 cursor-pointer"
                        style={{
                          background: isOn ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200"
                          style={{ transform: isOn ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4 pt-3 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <button
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all text-primary"
                  style={{
                    background: 'hsl(var(--bg-input))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  onClick={() => handleTileClose(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all hover:opacity-90 text-white"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                  }}
                  onClick={() => handleTileClose(true)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

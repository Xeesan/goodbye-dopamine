import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'hsl(var(--bg-primary))' }}>
          <div className="glass-card-accent text-center max-w-md w-full !p-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{
              background: 'hsl(var(--destructive) / 0.15)',
            }}>
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-5">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              className="btn-primary-auth"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

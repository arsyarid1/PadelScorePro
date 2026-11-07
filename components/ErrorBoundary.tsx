import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl text-white">
          <div className="max-w-md w-full p-6 rounded-2xl bg-surface border border-red-500/30 text-center flex flex-col items-center">
            <div className="size-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Terjadi Kesalahan Tampilan</h3>
            <p className="text-xs text-slate-400 mb-4 line-clamp-3">
              {this.state.error?.message || "Komponen mengalami kendala teknis."}
            </p>
            <button
              onClick={() => {
                (this as any).setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-background-dark font-black uppercase text-xs tracking-wider shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Tutup & Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

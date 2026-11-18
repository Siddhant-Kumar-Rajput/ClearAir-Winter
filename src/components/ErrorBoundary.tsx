import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6"
        >
          <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <h1 className="text-xl font-semibold text-[#0F172A]">
              Something interrupted ClearAir Winter
            </h1>
            <p className="text-sm text-[#475569] leading-relaxed">
              We prevented the page from crashing so your current session stays safe.
              You can retry rendering the workspace below.
            </p>
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 text-xs font-mono text-[#991B1B] break-words">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

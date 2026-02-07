import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message ?? 'Something went wrong.';
      const Fallback = this.props.fallback;
      if (Fallback) return <Fallback error={this.state.error} />;
      return (
        <div className="error-boundary" role="alert">
          <h2>Something went wrong</h2>
          <p>{message}</p>
          <button type="button" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

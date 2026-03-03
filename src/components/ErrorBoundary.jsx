import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
            <h1 className="text-xl font-bold text-red-600 mb-2">Une erreur s&apos;est produite</h1>
            <p className="text-sm text-[#666666] mb-4">
              L&apos;application n&apos;a pas pu afficher la page. Voici le message d&apos;erreur :
            </p>
            <pre className="p-4 bg-[#F5F5F5] rounded-xl text-xs overflow-auto max-h-40 mb-4">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <p className="text-xs text-[#999999] mb-4">
              Ouvrez la console du navigateur (F12 → Console) pour plus de détails.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-black/90"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

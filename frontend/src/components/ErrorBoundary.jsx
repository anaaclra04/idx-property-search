import { Component } from 'react';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // In a real production app this would report to a logging service.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <p>This part of the page hit an unexpected error.</p>
          <button type="button" onClick={this.handleReset} className="error-boundary__retry-btn">
            Try again
          </button>
          <a href="/" className="error-boundary__home-link">Back to listings</a>
        </div>
      );
    }

    return this.props.children;
  }
}
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey?: string }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('GROFT render error', error, info); }
  render() {
    if (this.state.error) return <main role="alert" style={{ padding: 32, color: 'inherit' }}><h1>Something went wrong</h1><p>{this.state.error.message}</p><button onClick={() => this.setState({ error: null })}>Try again</button></main>;
    return this.props.children;
  }
}

/**
 * Глобальный перехват ошибок рендера (M0.9).
 * Показывает пользователю понятный экран вместо белого поля и отправляет отчёт в Sentry.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { appConfig } from '@nurtaxi/shared-core/shared/config';

import { Sentry } from '../sentry';
import { ErrorBoundaryFallback } from './error-boundary-fallback';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[AppErrorBoundary]', error, info.componentStack);
    }

    if (!appConfig.sentryDsn) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setTag('source', 'error-boundary');
      scope.setLevel('fatal');
      scope.setExtra('componentStack', info.componentStack);
      Sentry.captureException(error);
    });
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return <ErrorBoundaryFallback error={error} onRetry={this.reset} />;
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';
import { safeLogError } from '@/shared/lib/safe-log';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    safeLogError('[ErrorBoundary]', error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Что-то пошло не так"
          subTitle="Попробуйте обновить страницу. Если ошибка повторяется — обратитесь к администратору."
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

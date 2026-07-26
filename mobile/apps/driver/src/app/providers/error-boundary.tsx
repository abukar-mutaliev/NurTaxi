/**
 * Глобальный перехват ошибок рендера (M0.9).
 * Показывает пользователю понятный экран вместо белого поля и отправляет отчёт в Sentry.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text } from '@nurtaxi/shared-core/shared/ui';

import { Sentry } from '../sentry';

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
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <Screen>
        <View style={{ flex: 1, gap: 16, justifyContent: 'center' }}>
          <Text variant="title">Что-то пошло не так</Text>
          <Text tone="muted">
            Мы уже получили отчёт об ошибке. Попробуйте вернуться на предыдущий экран.
          </Text>
          <Button onPress={this.reset} title="Попробовать снова" />
        </View>
      </Screen>
    );
  }
}

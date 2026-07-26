import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import type { AppError } from '../../api/api-error';
import { Button } from './button';
import { Text } from './text';

/** Индикатор загрузки на весь доступный блок. */
export function Loader({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { gap: theme.spacing.md }]}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      {label ? (
        <Text tone="muted" variant="caption">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { gap: theme.spacing.sm, padding: theme.spacing.xl }]}>
      <Text align="center" variant="subtitle">
        {title}
      </Text>
      {description ? (
        <Text align="center" tone="muted" variant="caption">
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export interface ErrorViewProps {
  error: AppError;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Единое отображение ошибки API. Кнопка повтора появляется только для retryable-ошибок. */
export function ErrorView({ error, onRetry, retryLabel = 'Повторить' }: ErrorViewProps) {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { gap: theme.spacing.md, padding: theme.spacing.xl }]}>
      <Text align="center" variant="subtitle">
        {error.message}
      </Text>
      <Text align="center" tone="muted" variant="micro">
        {error.code}
      </Text>
      {onRetry && error.retryable ? (
        <Button fullWidth={false} onPress={onRetry} title={retryLabel} variant="secondary" />
      ) : null}
    </View>
  );
}

/** Полоса-предупреждение об офлайне (`M5.5`, graceful degradation). */
export function OfflineBanner({ visible, label }: { visible: boolean; label: string }) {
  const theme = useTheme();
  if (!visible) {
    return null;
  }
  return (
    <View
      style={{
        backgroundColor: theme.colors.warningSurface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Text align="center" variant="caption">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
});

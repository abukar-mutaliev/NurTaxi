import { Alert, Button } from 'antd';
import type { ReactNode } from 'react';
import { EmptyState } from './empty-state';
import { PageLoader } from './page-loader';

interface QueryStateProps {
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/** Единые состояния загрузки / ошибки / пустого списка (W11.6). */
export function QueryState({
  isLoading,
  isError,
  errorMessage = 'Не удалось загрузить данные',
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: QueryStateProps) {
  if (isLoading) return <PageLoader />;
  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        message={errorMessage}
        action={
          onRetry ? (
            <Button size="small" onClick={onRetry}>
              Повторить
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return children;
}

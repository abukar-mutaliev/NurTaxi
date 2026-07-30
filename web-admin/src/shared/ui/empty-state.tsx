import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <Result
      status="info"
      title={title ?? t('common.empty')}
      subTitle={description}
      extra={
        actionLabel && onAction ? (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null
      }
    />
  );
}

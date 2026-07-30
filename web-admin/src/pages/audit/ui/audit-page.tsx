import { Button, Card, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLazyListAuditLogsQuery, type AuditLogEntry } from '@/entities/audit';
import { useActiveRegionId } from '@/features/region-context';
import { PageHeader, QueryState } from '@/shared/ui';
import { formatDate, getErrorMessage } from '@/shared/lib/utils';
import { getAuditActionLabel } from '@/shared/lib/audit-action-label';

const PAGE_SIZE = 30;

export function AuditPage() {
  const { t } = useTranslation();
  const regionId = useActiveRegionId();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const [fetchLogs, { isLoading, isFetching, isError, error }] = useLazyListAuditLogsQuery();

  const loadPage = useCallback(
    async (nextCursor?: string, replace = false) => {
      const result = await fetchLogs({
        regionId,
        limit: PAGE_SIZE,
        cursor: nextCursor,
      }).unwrap();
      setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor ?? undefined);
      setHasMore(result.hasMore);
    },
    [fetchLogs, regionId],
  );

  useEffect(() => {
    void loadPage(undefined, true);
  }, [loadPage]);

  const columns: ColumnsType<AuditLogEntry> = useMemo(
    () => [
      {
        title: 'Время',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: formatDate,
      },
      {
        title: 'Действие',
        dataIndex: 'action',
        key: 'action',
        width: 220,
        render: (action: string) => getAuditActionLabel(action),
      },
      {
        title: 'Ресурс',
        key: 'resource',
        render: (_, r) => `${r.resourceType}${r.resourceId ? ` · ${r.resourceId.slice(0, 8)}…` : ''}`,
      },
      {
        title: 'Администратор',
        dataIndex: 'actorLabel',
        key: 'actorLabel',
        render: (v: string | null) => v ?? '—',
      },
      {
        title: 'Регион',
        dataIndex: 'regionId',
        key: 'regionId',
        render: (v: string | null) => (v ? v.slice(0, 8) + '…' : '—'),
        width: 120,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Журнал аудита"
        subtitle="Действия администраторов и операторов в панели"
      />
      <QueryState
        isLoading={isLoading && items.length === 0}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && items.length === 0}
        emptyTitle="Записей пока нет"
        onRetry={() => void loadPage(undefined, true)}
      >
        <Card bordered={false}>
          <Table rowKey="id" columns={columns} dataSource={items} pagination={false} scroll={{ x: 900 }} />
          {hasMore ? (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button loading={isFetching} onClick={() => void loadPage(cursor)}>
                {t('common.refresh')}
              </Button>
            </div>
          ) : null}
        </Card>
      </QueryState>
    </div>
  );
}

import { Button, Card, DatePicker, Input, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLazyListAuditLogsQuery, type AuditLogEntry } from '@/entities/audit';
import { useActiveRegionId } from '@/features/region-context';
import { PageHeader, QueryState } from '@/shared/ui';
import { formatDate, getErrorMessage } from '@/shared/lib/utils';
import { getAuditActionLabel } from '@/shared/lib/audit-action-label';

const PAGE_SIZE = 30;
const { RangePicker } = DatePicker;

export function AuditPage() {
  const { t } = useTranslation();
  const regionId = useActiveRegionId();
  const [action, setAction] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const [fetchLogs, { isLoading, isFetching, isError, error }] = useLazyListAuditLogsQuery();

  const loadPage = useCallback(
    async (nextCursor?: string, replace = false) => {
      const result = await fetchLogs({
        regionId,
        action: action || undefined,
        from: range?.[0]?.startOf('day').toISOString(),
        to: range?.[1]?.endOf('day').toISOString(),
        limit: PAGE_SIZE,
        cursor: nextCursor,
      }).unwrap();
      setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor ?? undefined);
      setHasMore(result.hasMore);
    },
    [fetchLogs, regionId, action, range],
  );

  useEffect(() => {
    void loadPage(undefined, true);
  }, [loadPage]);

  const columns: ColumnsType<AuditLogEntry> = useMemo(
    () => [
      {
        title: t('audit.time'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: formatDate,
      },
      {
        title: t('audit.action'),
        dataIndex: 'action',
        key: 'action',
        width: 220,
        render: (value: string) => getAuditActionLabel(value),
      },
      {
        title: t('audit.resource'),
        key: 'resource',
        render: (_, r) => `${r.resourceType}${r.resourceId ? ` · ${r.resourceId.slice(0, 8)}…` : ''}`,
      },
      {
        title: t('audit.actor'),
        dataIndex: 'actorLabel',
        key: 'actorLabel',
        render: (v: string | null) => v ?? '—',
      },
      {
        title: t('common.region'),
        dataIndex: 'regionId',
        key: 'regionId',
        render: (v: string | null) => (v ? v.slice(0, 8) + '…' : '—'),
        width: 120,
      },
    ],
    [t],
  );

  return (
    <div>
      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        extra={
          <Space wrap>
            <Input
              allowClear
              placeholder={t('audit.actionFilter')}
              style={{ width: 240 }}
              value={action}
              onChange={(e) => setAction(e.target.value || undefined)}
            />
            <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
          </Space>
        }
      />
      <QueryState
        isLoading={isLoading && items.length === 0}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && items.length === 0}
        emptyTitle={t('audit.empty')}
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

import { EyeOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLazyListOrdersQuery, type Order } from '@/entities/order';
import { useActiveRegionId } from '@/features/region-context';
import { OrderStatus } from '@/shared/model/enums';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';
import { PageHeader, OrderStatusTag, QueryState, getOrderStatusSelectOptions } from '@/shared/ui';
import { formatCurrency, formatDate, getErrorMessage } from '@/shared/lib/utils';

const PAGE_SIZE = 20;
const { RangePicker } = DatePicker;

export function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const regionId = useActiveRegionId();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [dateField, setDateField] = useState<'created' | 'completed'>('created');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [items, setItems] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const [fetchOrders, { isLoading, isFetching, isError, error }] = useLazyListOrdersQuery();

  const loadPage = useCallback(
    async (nextCursor?: string, replace = false) => {
      const result = await fetchOrders({
        regionId,
        status: statusFilter,
        dateField,
        from: range?.[0]?.startOf('day').toISOString(),
        to: range?.[1]?.endOf('day').toISOString(),
        limit: PAGE_SIZE,
        cursor: nextCursor,
      }).unwrap();
      setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
      setCursor(result.nextCursor ?? undefined);
      setHasMore(result.hasMore);
    },
    [fetchOrders, regionId, statusFilter, dateField, range],
  );

  useEffect(() => {
    void loadPage(undefined, true);
  }, [loadPage]);

  const columns: ColumnsType<Order> = useMemo(
    () => [
      {
        title: t('orders.publicNumber'),
        dataIndex: 'publicNumber',
        key: 'publicNumber',
        width: 140,
        render: (v: string | undefined, r) => v ?? r.id.slice(0, 8) + '…',
      },
      {
        title: t('common.status'),
        dataIndex: 'status',
        key: 'status',
        render: (s: Order['status']) => <OrderStatusTag status={s} />,
      },
      { title: t('orders.pickup'), dataIndex: 'pickupAddress', key: 'pickupAddress', ellipsis: true },
      { title: t('orders.dropoff'), dataIndex: 'dropoffAddress', key: 'dropoffAddress', ellipsis: true },
      {
        title: t('orders.driver'),
        key: 'driver',
        render: (_, r) => r.driver?.fullName ?? '—',
      },
      {
        title: t('orders.price'),
        key: 'price',
        render: (_, r) => formatCurrency(r.priceFinal ?? r.priceEstimated),
      },
      {
        title: t('orders.createdAt'),
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: formatDate,
        width: 160,
      },
      {
        title: t('common.actions'),
        key: 'actions',
        render: (_, record) => (
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/orders/${record.id}`)}>
            {t('drivers.open')}
          </Button>
        ),
      },
    ],
    [navigate, t],
  );

  return (
    <div>
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        extra={
          <Space wrap>
            <Select
              value={dateField}
              onChange={setDateField}
              style={{ width: 180 }}
              options={[
                { value: 'created', label: t('orders.dateCreated') },
                { value: 'completed', label: t('orders.dateCompleted') },
              ]}
            />
            <RangePicker value={range} onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
            <Select
              allowClear
              placeholder={t('orders.statusFilter')}
              style={{ width: 220 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={getOrderStatusSelectOptions()}
            />
          </Space>
        }
      />
      <RegionScopeBanner />
      <QueryState
        isLoading={isLoading && items.length === 0}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && items.length === 0}
        emptyTitle={t('orders.empty')}
        emptyDescription={t('orders.emptyHint')}
        onRetry={() => void loadPage(undefined, true)}
      >
        <Card bordered={false}>
          <Table rowKey="id" columns={columns} dataSource={items} scroll={{ x: 1100 }} pagination={false} />
          {hasMore ? (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button loading={isFetching} onClick={() => void loadPage(cursor)}>
                {t('orders.loadMore')}
              </Button>
            </div>
          ) : null}
          {items.length > 0 ? (
            <Space style={{ marginTop: 12 }}>
              <span style={{ color: '#666' }}>
                {t('orders.shown')}: {items.length}
              </span>
            </Space>
          ) : null}
        </Card>
      </QueryState>
    </div>
  );
}

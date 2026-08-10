import { EyeOutlined } from '@ant-design/icons';
import { Button, Card, Rate, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListComplaintsQuery, type Complaint } from '@/entities/complaint';
import { useActiveRegionId } from '@/features/region-context';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';
import { PageHeader, PageLoader } from '@/shared/ui';
import { formatDate, formatPhone } from '@/shared/lib/utils';

const TARGET_LABELS: Record<string, string> = {
  driver: 'На водителя',
  client: 'На клиента',
};

export function AppealsPage() {
  const navigate = useNavigate();
  const regionId = useActiveRegionId();
  const { data = [], isLoading } = useListComplaintsQuery(regionId ? { regionId } : undefined);

  const columns: ColumnsType<Complaint> = useMemo(
    () => [
      {
        title: 'Дата',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: formatDate,
      },
      {
        title: 'Автор',
        key: 'author',
        render: (_, r) => (
          <Space direction="vertical" size={0}>
            <span>{r.authorName ?? '—'}</span>
            <span style={{ color: '#7a6e78', fontSize: 12 }}>{formatPhone(r.authorPhone)}</span>
          </Space>
        ),
      },
      {
        title: 'Тип',
        dataIndex: 'target',
        key: 'target',
        render: (t: string) => <Tag color="volcano">{TARGET_LABELS[t] ?? t}</Tag>,
      },
      {
        title: 'Оценка',
        dataIndex: 'rating',
        key: 'rating',
        width: 140,
        render: (v: number) => <Rate disabled value={v} />,
      },
      {
        title: 'Текст',
        dataIndex: 'text',
        key: 'text',
        ellipsis: true,
        render: (t: string | null) => t ?? '—',
      },
      {
        title: 'Заказ',
        key: 'order',
        render: (_, r) => r.orderPickupAddress ?? r.orderId.slice(0, 8) + '…',
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 120,
        render: (_, r) => (
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${r.orderId}`)}
          >
            Заказ
          </Button>
        ),
      },
    ],
    [navigate],
  );

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Обращения"
        subtitle="Жалобы клиентов и водителей по поездкам региона"
      />
      <RegionScopeBanner />
      <Card bordered={false}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          locale={{ emptyText: 'Жалоб пока нет' }}
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  );
}

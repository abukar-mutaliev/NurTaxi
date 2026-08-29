import { Alert, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useListRegistryChecksQuery, type RegistryCheck } from '@/entities/registry';
import { formatDate } from '@/shared/lib/utils';

const COLOR: Record<string, string> = {
  valid: 'green',
  invalid: 'red',
  not_found: 'orange',
  unavailable: 'default',
  unconfirmed: 'gold',
};

export function RegistryChecksCard({
  subjectType,
  subjectId,
}: {
  subjectType: string;
  subjectId?: string | null;
}) {
  const skip = !subjectId;
  const { data = [], isError } = useListRegistryChecksQuery(
    { subjectType, subjectId: subjectId ?? '' },
    { skip },
  );

  if (skip) {
    return <Alert type="info" showIcon message="Нет идентификатора для проверки в реестре" />;
  }
  if (isError) {
    return <Alert type="warning" showIcon message="Не удалось загрузить проверки реестра" />;
  }

  const columns: ColumnsType<RegistryCheck> = [
    { title: 'Время', dataIndex: 'checkedAt', key: 'checkedAt', render: formatDate, width: 170 },
    {
      title: 'Вердикт',
      dataIndex: 'verdict',
      key: 'verdict',
      render: (v: string) => <Tag color={COLOR[v] ?? 'default'}>{v}</Tag>,
    },
    { title: 'Источник', dataIndex: 'source', key: 'source', width: 100 },
  ];

  return (
    <Table
      rowKey="id"
      size="small"
      pagination={false}
      columns={columns}
      dataSource={data}
      locale={{ emptyText: 'Проверок пока нет' }}
    />
  );
}

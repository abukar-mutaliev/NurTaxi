import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Drawer, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateCarrierMutation,
  useListCarriersQuery,
  useListExpiringPermitsQuery,
  type Carrier,
} from '@/entities/carrier';
import { useListRegionsQuery } from '@/entities/region';
import { useActiveRegionId } from '@/features/region-context';
import { PageHeader, QueryState } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/utils';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';
import { RegistryChecksCard } from '@/widgets/registry-checks';

export function CarriersPage() {
  const { t } = useTranslation();
  const regionId = useActiveRegionId();
  const { data: regions = [] } = useListRegionsQuery();
  const { data = [], isLoading, isError, error, refetch } = useListCarriersQuery(
    regionId ? { regionId } : undefined,
  );
  const { data: expiring = [] } = useListExpiringPermitsQuery(regionId ? { regionId } : undefined);
  const [createCarrier, { isLoading: creating }] = useCreateCarrierMutation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Carrier | null>(null);
  const [form] = Form.useForm();

  const columns: ColumnsType<Carrier> = useMemo(
    () => [
      { title: t('carriers.name'), dataIndex: 'name', key: 'name' },
      { title: 'ИНН', dataIndex: 'inn', key: 'inn', width: 140 },
      { title: 'ОГРН', dataIndex: 'ogrn', key: 'ogrn', width: 160 },
      { title: t('carriers.legalForm'), dataIndex: 'legalForm', key: 'legalForm', width: 120 },
      {
        title: t('common.region'),
        dataIndex: 'regionId',
        key: 'regionId',
        render: (id: string) => regions.find((r) => r.id === id)?.name ?? id.slice(0, 8),
      },
      {
        title: t('common.status'),
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => <Tag>{status}</Tag>,
      },
    ],
    [regions, t],
  );

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createCarrier({ ...values, regionId: values.regionId ?? regionId }).unwrap();
      message.success(t('carriers.created'));
      setOpen(false);
      form.resetFields();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('carriers.title')}
        subtitle={t('carriers.subtitle')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('carriers.create')}
          </Button>
        }
      />
      <RegionScopeBanner />
      {expiring.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('carriers.expiringAlert', { count: expiring.length })}
        />
      ) : null}
      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && data.length === 0}
        emptyTitle={t('carriers.empty')}
        onRetry={() => void refetch()}
      >
        <Card bordered={false}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            scroll={{ x: 960 }}
            onRow={(record) => ({ onClick: () => setSelected(record) })}
          />
        </Card>
      </QueryState>
      <Modal
        title={t('carriers.create')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
        okText={t('common.create')}
      >
        <Form form={form} layout="vertical" initialValues={{ regionId, legalForm: 'ООО' }}>
          <Form.Item name="name" label={t('carriers.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="legalForm" label={t('carriers.legalForm')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="inn" label="ИНН" rules={[{ required: true, min: 10, max: 12 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ogrn" label="ОГРН / ОГРНИП" rules={[{ required: true, min: 13, max: 15 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('carriers.address')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('auth.phone')}>
            <Input />
          </Form.Item>
          <Form.Item
            name="regionId"
            label={t('common.region')}
            rules={[{ required: true }]}
          >
            <Select
              disabled={Boolean(regionId)}
              options={regions.map((r) => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={selected?.name}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        width={480}
      >
        {selected ? (
          <>
            <p>
              ИНН {selected.inn} · ОГРН {selected.ogrn}
            </p>
            <RegistryChecksCard subjectType="carrier" subjectId={selected.id} />
          </>
        ) : null}
      </Drawer>
    </div>
  );
}

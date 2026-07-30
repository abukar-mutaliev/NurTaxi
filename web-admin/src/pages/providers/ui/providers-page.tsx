import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Modal, Select, Switch, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateProviderMutation,
  useListProvidersQuery,
  useUpdateProviderMutation,
  type ProviderConfig,
} from '@/entities/provider';
import { useActiveRegionId } from '@/features/region-context';
import { ProviderType } from '@/shared/model/enums';
import { PageHeader, ActiveTag, PageLoader } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  payment: 'Платежи',
  sms: 'SMS',
  maps: 'Карты',
};

export function ProvidersPage() {
  const { t } = useTranslation();
  const regionId = useActiveRegionId();
  const { data = [], isLoading, refetch } = useListProvidersQuery(
    regionId ? { regionId } : undefined,
  );
  const [createProvider, { isLoading: creating }] = useCreateProviderMutation();
  const [updateProvider] = useUpdateProviderMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<ProviderConfig> = useMemo(
    () => [
      {
        title: t('providers.type'),
        dataIndex: 'type',
        key: 'type',
        render: (type: string) => <Tag>{TYPE_LABELS[type] ?? type}</Tag>,
      },
      { title: t('providers.provider'), dataIndex: 'provider', key: 'provider' },
      { title: t('providers.credentialsRef'), dataIndex: 'credentialsRef', key: 'credentialsRef' },
      {
        title: t('common.status'),
        dataIndex: 'isActive',
        key: 'isActive',
        render: (active: boolean) => <ActiveTag active={active} />,
      },
      {
        title: t('common.actions'),
        key: 'actions',
        render: (_, record) => (
          <Switch
            checked={record.isActive}
            onChange={async (checked) => {
              try {
                await updateProvider({ id: record.id, body: { isActive: checked } }).unwrap();
                message.success('Провайдер обновлён');
              } catch (err) {
                message.error(getErrorMessage(err));
              }
            }}
          />
        ),
      },
    ],
    [t, updateProvider],
  );

  const handleCreate = async () => {
    if (!regionId) return;
    try {
      const values = await form.validateFields();
      await createProvider({ ...values, regionId }).unwrap();
      message.success('Провайдер подключён');
      setOpen(false);
      form.resetFields();
      void refetch();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(getErrorMessage(err));
    }
  };

  if (!regionId) {
    return (
      <div>
        <PageHeader title={t('providers.title')} />
        <Alert type="info" showIcon message="Выберите регион для управления провайдерами." />
      </div>
    );
  }

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t('providers.title')}
        subtitle="Платёжные, SMS и картографические провайдеры региона"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('providers.create')}
          </Button>
        }
      />
      <Card bordered={false}>
        <Table rowKey="id" columns={columns} dataSource={data} />
      </Card>

      <Modal
        title={t('providers.create')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical" initialValues={{ provider: 'stub' }}>
          <Form.Item name="type" label={t('providers.type')} rules={[{ required: true }]}>
            <Select
              options={Object.values(ProviderType).map((v) => ({
                value: v,
                label: TYPE_LABELS[v] ?? v,
              }))}
            />
          </Form.Item>
          <Form.Item name="provider" label={t('providers.provider')} rules={[{ required: true }]}>
            <Input placeholder="stub" />
          </Form.Item>
          <Form.Item
            name="credentialsRef"
            label={t('providers.credentialsRef')}
            rules={[{ required: true }]}
          >
            <Input placeholder="vault://nurtaxi/staging/payment" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Space, Switch, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCreateRegionMutation,
  useListRegionsQuery,
  useUpdateRegionMutation,
  FEATURE_FLAGS,
  getFeatureFlagLabel,
  type Region,
} from '@/entities/region';
import { PageHeader, ActiveTag, QueryState } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/utils';

export function RegionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data = [], isLoading, isError, error, refetch } = useListRegionsQuery({ includeInactive: true });
  const [createRegion, { isLoading: creating }] = useCreateRegionMutation();
  const [updateRegion] = useUpdateRegionMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<Region> = useMemo(
    () => [
      { title: t('regions.name'), dataIndex: 'name', key: 'name' },
      { title: t('regions.timezone'), dataIndex: 'timezone', key: 'timezone' },
      { title: t('regions.currency'), dataIndex: 'currency', key: 'currency' },
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
          <Space>
            <Button type="link" onClick={() => navigate(`/regions/${record.id}`)}>
              {t('common.edit')}
            </Button>
            <Switch
              checked={record.isActive}
              checkedChildren="Вкл"
              unCheckedChildren="Выкл"
              onChange={async (checked) => {
                try {
                  await updateRegion({ id: record.id, body: { isActive: checked } }).unwrap();
                  message.success('Статус обновлён');
                } catch (err) {
                  message.error(getErrorMessage(err));
                }
              }}
            />
          </Space>
        ),
      },
    ],
    [navigate, t, updateRegion],
  );

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const featureFlags = FEATURE_FLAGS.reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = values[`flag_${key}`] ?? false;
        return acc;
      }, {});
      await createRegion({
        name: values.name,
        timezone: values.timezone,
        currency: values.currency,
        featureFlags,
      }).unwrap();
      message.success('Регион создан');
      setOpen(false);
      form.resetFields();
      void refetch();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('regions.title')}
        subtitle="Управление регионами и feature-флагами платформы"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('regions.create')}
          </Button>
        }
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && data.length === 0}
        emptyTitle="Регионов пока нет"
        onRetry={() => void refetch()}
      >
        <Card bordered={false}>
          <Table rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 10 }} />
        </Card>
      </QueryState>

      <Modal
        title={t('regions.create')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        width={520}
      >
        <Form form={form} layout="vertical" initialValues={{ timezone: 'Europe/Moscow', currency: 'RUB' }}>
          <Form.Item name="name" label={t('regions.name')} rules={[{ required: true }]}>
            <Input placeholder="Ингушетия" />
          </Form.Item>
          <Form.Item name="timezone" label={t('regions.timezone')}>
            <Input />
          </Form.Item>
          <Form.Item name="currency" label={t('regions.currency')}>
            <Input />
          </Form.Item>
          {FEATURE_FLAGS.map((flag) => (
            <Form.Item
              key={flag}
              name={`flag_${flag}`}
              label={getFeatureFlagLabel(t, flag)}
              valuePropName="checked"
              initialValue={false}
            >
              <Switch checkedChildren={t('regions.switchOn')} unCheckedChildren={t('regions.switchOff')} />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}

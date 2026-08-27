import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateSiteMutation,
  useLazyExportSitesQuery,
  useListSitesQuery,
  type PlacementSite,
} from '@/entities/placement';
import { PageHeader, QueryState } from '@/shared/ui';
import { formatDate, getErrorMessage } from '@/shared/lib/utils';

export function PlacementPage() {
  const { t } = useTranslation();
  const { data = [], isLoading, isError, error, refetch } = useListSitesQuery();
  const [exportSites, { isFetching: exporting }] = useLazyExportSitesQuery();
  const [createSite, { isLoading: creating }] = useCreateSiteMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<PlacementSite> = useMemo(
    () => [
      { title: t('placement.name'), dataIndex: 'name', key: 'name' },
      { title: t('placement.operator'), dataIndex: 'operator', key: 'operator' },
      { title: t('placement.address'), dataIndex: 'address', key: 'address', ellipsis: true },
      { title: t('placement.regionCode'), dataIndex: 'regionCode', key: 'regionCode', width: 100 },
      { title: t('placement.purpose'), dataIndex: 'purpose', key: 'purpose', width: 140 },
      {
        title: t('placement.period'),
        key: 'period',
        render: (_, r) => `${formatDate(r.periodFrom)}${r.periodTo ? ` — ${formatDate(r.periodTo)}` : ''}`,
      },
      {
        title: t('common.status'),
        dataIndex: 'isActive',
        key: 'isActive',
        render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? t('common.active') : t('common.inactive')}</Tag>,
      },
    ],
    [t],
  );

  const handleExport = async () => {
    try {
      const doc = await exportSites().unwrap();
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'placement-sites.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createSite(values).unwrap();
      message.success(t('placement.created'));
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
        title={t('placement.title')}
        subtitle={t('placement.subtitle')}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => void handleExport()}>
              {t('placement.export')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              {t('placement.create')}
            </Button>
          </Space>
        }
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && data.length === 0}
        emptyTitle={t('placement.empty')}
        onRetry={() => void refetch()}
      >
        <Card bordered={false}>
          <Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 1100 }} />
        </Card>
      </QueryState>
      <Modal
        title={t('placement.create')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
        okText={t('common.create')}
      >
        <Form form={form} layout="vertical" initialValues={{ purpose: 'compute', regionCode: 'RU-IN' }}>
          <Form.Item name="name" label={t('placement.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="operator" label={t('placement.operator')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('placement.address')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="regionCode" label={t('placement.regionCode')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="purpose" label={t('placement.purpose')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contractRef" label={t('placement.contractRef')}>
            <Input />
          </Form.Item>
          <Form.Item name="periodFrom" label={t('placement.periodFrom')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

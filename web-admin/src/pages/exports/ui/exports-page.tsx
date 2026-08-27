import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCreateExportMutation,
  useLazyGetExportDownloadQuery,
  useListExportsQuery,
  type RegulatoryExport,
} from '@/entities/export';
import { useActiveRegionId } from '@/features/region-context';
import { PageHeader, QueryState } from '@/shared/ui';
import { formatDate, getErrorMessage } from '@/shared/lib/utils';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';

const STATUS_COLOR: Record<string, string> = {
  queued: 'default',
  running: 'blue',
  ready: 'green',
  failed: 'red',
  expired: 'orange',
};

export function ExportsPage() {
  const { t } = useTranslation();
  const regionId = useActiveRegionId();
  const { data = [], isLoading, isError, error, refetch } = useListExportsQuery(
    regionId ? { regionId } : undefined,
  );
  const [createExport, { isLoading: creating }] = useCreateExportMutation();
  const [getDownload] = useLazyGetExportDownloadQuery();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<RegulatoryExport> = useMemo(
    () => [
      { title: t('exports.requestRef'), dataIndex: 'requestRef', key: 'requestRef' },
      { title: t('exports.legalBasis'), dataIndex: 'legalBasis', key: 'legalBasis', ellipsis: true },
      {
        title: t('exports.period'),
        key: 'period',
        render: (_, r) => `${formatDate(r.periodFrom)} — ${formatDate(r.periodTo)}`,
      },
      { title: t('exports.format'), dataIndex: 'format', key: 'format', width: 80 },
      {
        title: t('common.status'),
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
      },
      { title: t('exports.rows'), dataIndex: 'rowCount', key: 'rowCount', width: 90, render: (v: number | null) => v ?? '—' },
      {
        title: t('common.actions'),
        key: 'actions',
        render: (_, r) =>
          r.status === 'ready' ? (
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() => void handleDownload(r.id)}
            >
              {t('exports.download')}
            </Button>
          ) : null,
      },
    ],
    [t],
  );

  const handleDownload = async (id: string) => {
    try {
      const result = await getDownload(id).unwrap();
      window.open(result.downloadUrl, '_blank', 'noopener');
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createExport({
        ...values,
        regionId: regionId ?? values.regionId,
      }).unwrap();
      message.success(t('exports.created'));
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
        title={t('exports.title')}
        subtitle={t('exports.subtitle')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('exports.create')}
          </Button>
        }
      />
      <RegionScopeBanner />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        errorMessage={getErrorMessage(error)}
        isEmpty={!isLoading && data.length === 0}
        emptyTitle={t('exports.empty')}
        onRetry={() => void refetch()}
      >
        <Card bordered={false}>
          <Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 1100 }} />
        </Card>
      </QueryState>
      <Modal
        title={t('exports.create')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreate()}
        confirmLoading={creating}
        okText={t('common.create')}
      >
        <Form form={form} layout="vertical" initialValues={{ format: 'csv', dateField: 'created' }}>
          <Form.Item name="legalBasis" label={t('exports.legalBasis')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="requestRef" label={t('exports.requestRef')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="periodFrom" label={t('exports.periodFrom')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="periodTo" label={t('exports.periodTo')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="dateField" label={t('exports.dateField')}>
            <Select
              options={[
                { value: 'created', label: t('exports.dateCreated') },
                { value: 'completed', label: t('exports.dateCompleted') },
              ]}
            />
          </Form.Item>
          <Form.Item name="format" label={t('exports.format')}>
            <Select options={[{ value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

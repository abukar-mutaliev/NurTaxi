import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCreateCityMutation,
  useGetDriverRequirementCatalogQuery,
  useGetRegionQuery,
  useListCitiesQuery,
  useUpdateCityMutation,
  useUpdateRegionMutation,
  getFeatureFlagLabel,
  type City,
  type RequirementMode,
  type RegionComplianceConfig,
} from '@/entities/region';
import { PageHeader, ActiveTag, PageLoader } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/utils';

export function RegionDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: region, isLoading } = useGetRegionQuery(id, { skip: !id });
  const { data: cities = [], refetch } = useListCitiesQuery({ regionId: id, includeInactive: true }, { skip: !id });
  const { data: requirementCatalog } = useGetDriverRequirementCatalogQuery();
  const [createCity, { isLoading: creating }] = useCreateCityMutation();
  const [updateCity] = useUpdateCityMutation();
  const [updateRegion] = useUpdateRegionMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<City> = useMemo(
    () => [
      { title: t('regions.name'), dataIndex: 'name', key: 'name' },
      {
        title: t('regions.coordinates'),
        key: 'coords',
        render: (_, r) =>
          r.centerLat && r.centerLng ? `${r.centerLat}, ${r.centerLng}` : '—',
      },
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
            checkedChildren={t('regions.switchOn')}
            unCheckedChildren={t('regions.switchOff')}
            onChange={async (checked) => {
              try {
                await updateCity({
                  regionId: id,
                  cityId: record.id,
                  body: { isActive: checked },
                }).unwrap();
                message.success(t('regions.cityUpdated'));
              } catch (err) {
                message.error(getErrorMessage(err));
              }
            }}
          />
        ),
      },
    ],
    [id, t, updateCity],
  );

  const handleCreateCity = async () => {
    try {
      const values = await form.validateFields();
      await createCity({ regionId: id, body: values }).unwrap();
      message.success(t('regions.cityAdded'));
      setOpen(false);
      form.resetFields();
      void refetch();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(getErrorMessage(err));
    }
  };

  const saveCompliance = async (patch: Partial<RegionComplianceConfig>) => {
    if (!region) return;
    try {
      await updateRegion({
        id,
        body: {
          complianceConfig: {
            ...(region.complianceConfig ?? {
              taxiRegistryRequired: false,
              taxiRegistryStrict: false,
              risTransferEnabled: false,
              risPayloadSchema: 'v1',
              tripTrackIntervalSec: 10,
              tripTrackRetentionDays: 180,
            }),
            ...patch,
          },
        },
      }).unwrap();
      message.success(t('regions.regionUpdated'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };
  const saveRequirement = async (key: string, mode: RequirementMode) => {
    try {
      await updateRegion({
        id,
        body: {
          driverRequirements: {
            ...(region?.driverRequirements ?? {}),
            [key]: mode,
          },
        },
      }).unwrap();
      message.success(t('regions.requirementUpdated'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  if (isLoading || !region) return <PageLoader />;

  const flags = Object.entries(region.featureFlags ?? {});

  return (
    <div>
      <PageHeader
        title={region.name}
        subtitle={t('regions.detailSubtitle')}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/regions')}>
            {t('common.back')}
          </Button>
        }
      />

      <Card bordered={false} style={{ marginBottom: 24 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label={t('regions.timezone')}>{region.timezone}</Descriptions.Item>
          <Descriptions.Item label={t('regions.currency')}>{region.currency}</Descriptions.Item>
          <Descriptions.Item label={t('common.status')}>
            <ActiveTag active={region.isActive} />
          </Descriptions.Item>
        </Descriptions>
        {flags.length > 0 && (
          <Descriptions title={t('regions.featureFlags')} style={{ marginTop: 16 }}>
            {flags.map(([key, value]) => (
              <Descriptions.Item key={key} label={getFeatureFlagLabel(t, key)}>
                {value ? t('regions.flagEnabled') : t('regions.flagDisabled')}
              </Descriptions.Item>
            ))}
          </Descriptions>
        )}
        <Space style={{ marginTop: 16 }}>
          <Switch
            checked={region.isActive}
            checkedChildren={t('regions.regionActive')}
            unCheckedChildren={t('regions.regionInactive')}
            onChange={async (checked) => {
              try {
                await updateRegion({ id, body: { isActive: checked } }).unwrap();
                message.success(t('regions.regionUpdated'));
              } catch (err) {
                message.error(getErrorMessage(err));
              }
            }}
          />
        </Space>
      </Card>

      <Card title={t('regions.compliance')} bordered={false} style={{ marginBottom: 24 }}>
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {t('regions.complianceHint')}
        </Typography.Paragraph>
        <Space direction="vertical" size="middle">
          <Switch
            checked={region.complianceConfig?.taxiRegistryRequired ?? false}
            checkedChildren={t('regions.registryRequired')}
            unCheckedChildren={t('regions.registryOff')}
            onChange={(checked) => void saveCompliance({ taxiRegistryRequired: checked })}
          />
          <Switch
            checked={region.complianceConfig?.taxiRegistryStrict ?? false}
            checkedChildren={t('regions.registryStrict')}
            unCheckedChildren={t('regions.registrySoft')}
            onChange={(checked) => void saveCompliance({ taxiRegistryStrict: checked })}
          />
          <Switch
            checked={region.complianceConfig?.risTransferEnabled ?? false}
            checkedChildren={t('regions.risOn')}
            unCheckedChildren={t('regions.risOff')}
            onChange={(checked) => void saveCompliance({ risTransferEnabled: checked })}
          />
        </Space>
      </Card>

      <Card
        title={t('regions.driverRequirements')}
        bordered={false}
        style={{ marginBottom: 24 }}
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          {t('regions.driverRequirementsHint')}
        </Typography.Paragraph>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {(requirementCatalog?.requirements ?? []).map((requirement) => (
            <Space key={requirement.key} align="start" size="middle" wrap>
              <Select<RequirementMode>
                onChange={(mode) => void saveRequirement(requirement.key, mode)}
                options={(requirementCatalog?.modes ?? []).map((mode) => ({
                  value: mode,
                  label: t(`regions.requirementModes.${mode}`),
                }))}
                style={{ minWidth: 180 }}
                value={
                  region.driverRequirements?.[requirement.key] ??
                  requirementCatalog?.defaults?.[requirement.key]
                }
              />
              <div>
                <Typography.Text strong>{requirement.label}</Typography.Text>
                <br />
                <Typography.Text type="secondary">{requirement.description}</Typography.Text>
              </div>
            </Space>
          ))}
        </Space>
      </Card>

      <Card
        title={t('regions.cities')}
        bordered={false}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('regions.addCity')}
          </Button>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={cities} pagination={false} />
      </Card>

      <Modal
        title={t('regions.createCity')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleCreateCity()}
        confirmLoading={creating}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('regions.name')} rules={[{ required: true }]}>
            <Input placeholder={t('regions.cityPlaceholder')} />
          </Form.Item>
          <Form.Item name="centerLat" label={t('regions.latitude')}>
            <Input type="number" step="any" />
          </Form.Item>
          <Form.Item name="centerLng" label={t('regions.longitude')}>
            <Input type="number" step="any" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

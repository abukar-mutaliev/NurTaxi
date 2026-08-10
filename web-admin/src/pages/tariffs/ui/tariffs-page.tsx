import { EditOutlined, PlusOutlined } from '@ant-design/icons';

import {

  Button,

  Card,

  DatePicker,

  Form,

  Input,

  InputNumber,

  Modal,

  Space,

  Switch,

  Table,

  message,

} from 'antd';

import type { ColumnsType } from 'antd/es/table';

import type { FormInstance } from 'antd/es/form';

import dayjs from 'dayjs';

import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import {

  useCreateTariffMutation,

  useListTariffsQuery,

  useUpdateTariffMutation,

  type CreateTariffDto,

  type Tariff,

  type UpdateTariffDto,

} from '@/entities/tariff';

import { useActiveRegionId } from '@/features/region-context';

import { RegionScopeBanner } from '@/widgets/region-scope-banner';

import { PageHeader, ActiveTag, PageLoader } from '@/shared/ui';

import { getErrorMessage } from '@/shared/lib/utils';



type TariffFormValues = {

  name: string;

  baseFare: number;

  pricePerKm: number;

  pricePerMin: number;

  minPrice: number;

  commissionPercent: number;

  effectiveFrom?: dayjs.Dayjs;

  surgeEnabled?: boolean;

  surgeMultiplier?: number;

  freeCancelBeforeAssigned?: boolean;

  feeAfterAssigned?: number;

  feeAfterArrived?: number;

  isActive?: boolean;

};



function toFormValues(tariff: Tariff): TariffFormValues {

  return {

    name: tariff.name,

    baseFare: Number(tariff.baseFare),

    pricePerKm: Number(tariff.pricePerKm),

    pricePerMin: Number(tariff.pricePerMin),

    minPrice: Number(tariff.minPrice),

    commissionPercent: Number(tariff.commissionPercent),

    effectiveFrom: dayjs(tariff.effectiveFrom),

    surgeEnabled: tariff.surgeRules.enabled ?? false,

    surgeMultiplier: tariff.surgeRules.multiplier ?? 1.2,

    freeCancelBeforeAssigned: tariff.cancellationPolicy.freeCancelBeforeAssigned ?? true,

    feeAfterAssigned: tariff.cancellationPolicy.feeAfterAssigned ?? 0,

    feeAfterArrived: tariff.cancellationPolicy.feeAfterArrived ?? 0,

    isActive: tariff.isActive,

  };

}



function toTariffPayload(values: TariffFormValues): Omit<CreateTariffDto, 'regionId'> {

  return {

    name: values.name,

    baseFare: values.baseFare,

    pricePerKm: values.pricePerKm,

    pricePerMin: values.pricePerMin,

    minPrice: values.minPrice,

    commissionPercent: values.commissionPercent,

    effectiveFrom: values.effectiveFrom?.toISOString(),

    surgeRules: { enabled: values.surgeEnabled, multiplier: values.surgeMultiplier },

    cancellationPolicy: {

      freeCancelBeforeAssigned: values.freeCancelBeforeAssigned,

      feeAfterAssigned: values.feeAfterAssigned,

      feeAfterArrived: values.feeAfterArrived,

    },

  };

}



function TariffFormFields({ form, t, showStatus }: { form: FormInstance; t: (key: string) => string; showStatus?: boolean }) {

  return (

    <Form form={form} layout="vertical">

      <Form.Item name="name" label="Название" rules={[{ required: true }]}>

        <Input placeholder="Стандарт" />

      </Form.Item>

      <Form.Item name="baseFare" label={t('tariffs.baseFare')} rules={[{ required: true }]}>

        <InputNumber min={0} style={{ width: '100%' }} addonAfter="₽" />

      </Form.Item>

      <Form.Item name="pricePerKm" label={t('tariffs.pricePerKm')} rules={[{ required: true }]}>

        <InputNumber min={0} style={{ width: '100%' }} addonAfter="₽" />

      </Form.Item>

      <Form.Item name="pricePerMin" label={t('tariffs.pricePerMin')} rules={[{ required: true }]}>

        <InputNumber min={0} style={{ width: '100%' }} addonAfter="₽" />

      </Form.Item>

      <Form.Item name="minPrice" label={t('tariffs.minPrice')} rules={[{ required: true }]}>

        <InputNumber min={0} style={{ width: '100%' }} addonAfter="₽" />

      </Form.Item>

      <Form.Item name="commissionPercent" label={t('tariffs.commission')} rules={[{ required: true }]}>

        <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />

      </Form.Item>

      <Form.Item name="effectiveFrom" label={t('tariffs.effectiveFrom')}>

        <DatePicker showTime style={{ width: '100%' }} />

      </Form.Item>

      {showStatus ? (

        <Form.Item name="isActive" label={t('common.status')} valuePropName="checked">

          <Switch checkedChildren={t('common.active')} unCheckedChildren={t('common.inactive')} />

        </Form.Item>

      ) : null}

      <Form.Item name="surgeEnabled" label={t('tariffs.surgePricing')} valuePropName="checked">

        <Switch />

      </Form.Item>

      <Form.Item name="surgeMultiplier" label={t('tariffs.surgeMultiplier')}>

        <InputNumber min={1} step={0.1} style={{ width: '100%' }} />

      </Form.Item>

      <Form.Item

        name="freeCancelBeforeAssigned"

        label="Бесплатная отмена до назначения"

        valuePropName="checked"

      >

        <Switch />

      </Form.Item>

      <Form.Item name="feeAfterAssigned" label="Штраф после назначения">

        <InputNumber min={0} style={{ width: '100%' }} addonAfter="₽" />

      </Form.Item>

      <Form.Item name="feeAfterArrived" label="Штраф после прибытия">

        <InputNumber min={0} style={{ width: '100%' }} addonAfter="₽" />

      </Form.Item>

    </Form>

  );

}



export function TariffsPage() {

  const { t } = useTranslation();

  const regionId = useActiveRegionId();

  const { data = [], isLoading, refetch } = useListTariffsQuery(

    { regionId: regionId! },

    { skip: !regionId },

  );

  const [createTariff, { isLoading: creating }] = useCreateTariffMutation();

  const [updateTariff, { isLoading: updating }] = useUpdateTariffMutation();

  const [createOpen, setCreateOpen] = useState(false);

  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);

  const [createForm] = Form.useForm<TariffFormValues>();

  const [editForm] = Form.useForm<TariffFormValues>();



  const columns: ColumnsType<Tariff> = useMemo(

    () => [

      { title: 'Название', dataIndex: 'name', key: 'name' },

      { title: 'Посадка', dataIndex: 'baseFare', key: 'baseFare', render: (v) => `${v} ₽` },

      { title: 'За км', dataIndex: 'pricePerKm', key: 'pricePerKm', render: (v) => `${v} ₽` },

      { title: 'За мин', dataIndex: 'pricePerMin', key: 'pricePerMin', render: (v) => `${v} ₽` },

      { title: 'Мин. цена', dataIndex: 'minPrice', key: 'minPrice', render: (v) => `${v} ₽` },

      {

        title: 'Комиссия',

        dataIndex: 'commissionPercent',

        key: 'commissionPercent',

        render: (v) => `${v}%`,

      },

      {

        title: 'Действует с',

        dataIndex: 'effectiveFrom',

        key: 'effectiveFrom',

        render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm'),

      },

      {

        title: 'Статус',

        dataIndex: 'isActive',

        key: 'isActive',

        render: (active: boolean) => <ActiveTag active={active} />,

      },

      {

        title: t('common.actions'),

        key: 'actions',

        width: 180,

        render: (_, record) => (

          <Space>

            <Button

              size="small"

              icon={<EditOutlined />}

              onClick={() => {

                setEditingTariff(record);

                editForm.setFieldsValue(toFormValues(record));

              }}

            >

              {t('common.edit')}

            </Button>

            <Switch

              checked={record.isActive}

              onChange={async (checked) => {

                try {

                  await updateTariff({ id: record.id, body: { isActive: checked } }).unwrap();

                  message.success('Тариф обновлён');

                } catch (err) {

                  message.error(getErrorMessage(err));

                }

              }}

            />

          </Space>

        ),

      },

    ],

    [editForm, t, updateTariff],

  );



  const handleCreate = async () => {

    if (!regionId) return;

    try {

      const values = await createForm.validateFields();

      await createTariff({ regionId, ...toTariffPayload(values) }).unwrap();

      message.success('Тариф создан');

      setCreateOpen(false);

      createForm.resetFields();

      void refetch();

    } catch (err) {

      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;

      message.error(getErrorMessage(err));

    }

  };



  const handleUpdate = async () => {

    if (!editingTariff) return;

    try {

      const values = await editForm.validateFields();

      const payload: UpdateTariffDto = {

        ...toTariffPayload(values),

        isActive: values.isActive,

      };

      await updateTariff({ id: editingTariff.id, body: payload }).unwrap();

      message.success('Тариф обновлён');

      setEditingTariff(null);

      editForm.resetFields();

      void refetch();

    } catch (err) {

      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;

      message.error(getErrorMessage(err));

    }

  };



  if (!regionId) {

    return (

      <div>

        <PageHeader title={t('tariffs.title')} />

        <RegionScopeBanner requireRegion />

      </div>

    );

  }



  if (isLoading) return <PageLoader />;



  return (

    <div>

      <PageHeader

        title={t('tariffs.title')}

        subtitle="Тарифы, комиссии и политика отмены"

        extra={

          <Button

            type="primary"

            icon={<PlusOutlined />}

            onClick={() => {

              createForm.resetFields();

              createForm.setFieldsValue({

                commissionPercent: 15,

                surgeMultiplier: 1.2,

                freeCancelBeforeAssigned: true,

                feeAfterAssigned: 0,

                feeAfterArrived: 0,

              });

              setCreateOpen(true);

            }}

          >

            {t('tariffs.create')}

          </Button>

        }

      />

      <RegionScopeBanner />

      <Card bordered={false}>

        <Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 1000 }} />

      </Card>



      <Modal

        title={t('tariffs.create')}

        open={createOpen}

        onCancel={() => setCreateOpen(false)}

        onOk={() => void handleCreate()}

        confirmLoading={creating}

        width={640}

        okText={t('common.create')}

      >

        <TariffFormFields form={createForm} t={t} />

      </Modal>



      <Modal

        title={t('tariffs.edit')}

        open={Boolean(editingTariff)}

        onCancel={() => {

          setEditingTariff(null);

          editForm.resetFields();

        }}

        onOk={() => void handleUpdate()}

        confirmLoading={updating}

        width={640}

        okText={t('common.save')}

      >

        <TariffFormFields form={editForm} t={t} showStatus />

      </Modal>

    </div>

  );

}



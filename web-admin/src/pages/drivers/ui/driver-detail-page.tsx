import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useApproveDriverMutation,
  useBlockDriverMutation,
  useDeleteDriverMutation,
  useGetDriverQuery,
  useModerateDocumentMutation,
  useUpdateDriverMutation,
  type DriverDocument,
} from '@/entities/driver';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';
import { DocumentStatus, UserStatus } from '@/shared/model/enums';
import { PageHeader, PageLoader, VerificationStatusTag, DocumentStatusTag } from '@/shared/ui';
import { formatPhone, getErrorMessage } from '@/shared/lib/utils';

const { Text } = Typography;

const DOC_LABELS: Record<string, string> = {
  passport: 'Паспорт',
  license: 'Водительское удостоверение',
  sts: 'СТС',
  osago: 'ОСАГО',
  car_photo: 'Фото авто',
  interior_photo: 'Фото салона',
  selfie: 'Селфи',
};

export function DriverDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: driver, isLoading } = useGetDriverQuery(id, { skip: !id });
  const [moderateDocument, { isLoading: moderating }] = useModerateDocumentMutation();
  const [blockDriver, { isLoading: blocking }] = useBlockDriverMutation();
  const [updateDriver, { isLoading: updating }] = useUpdateDriverMutation();
  const [approveDriver, { isLoading: approving }] = useApproveDriverMutation();
  const [deleteDriver, { isLoading: deleting }] = useDeleteDriverMutation();
  const [rejectModal, setRejectModal] = useState<{ docId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (searchParams.get('edit') === '1') {
      setEditOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!driver || !editOpen) return;
    const vehicle = driver.vehicles[0];
    form.setFieldsValue({
      fullName: driver.fullName,
      birthDate: driver.birthDate,
      residenceAddress: driver.residenceAddress,
      drivingExperienceYears: driver.drivingExperienceYears,
      vehicleMake: vehicle?.make,
      vehicleModel: vehicle?.model,
      vehiclePlateNumber: vehicle?.plateNumber,
      vehicleColor: vehicle?.color,
      vehicleYear: vehicle?.year,
    });
  }, [driver, editOpen, form]);

  const handleApprove = async (documentId: string) => {
    try {
      await moderateDocument({
        driverId: id,
        documentId,
        body: { status: DocumentStatus.Approved },
      }).unwrap();
      message.success(t('drivers.docApproved'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await moderateDocument({
        driverId: id,
        documentId: rejectModal.docId,
        body: { status: DocumentStatus.Rejected, rejectionReason: rejectReason },
      }).unwrap();
      message.success(t('drivers.docRejected'));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleToggleBlock = async () => {
    if (!driver) return;
    const isBlocked = driver.accountStatus === UserStatus.Blocked;
    try {
      await blockDriver({
        id,
        status: isBlocked ? UserStatus.Active : UserStatus.Blocked,
      }).unwrap();
      message.success(isBlocked ? t('drivers.driverUnblocked') : t('drivers.driverBlocked'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleApproveAll = async () => {
    try {
      await approveDriver(id).unwrap();
      message.success(t('drivers.driverApproved'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDriver(id).unwrap();
      message.success(t('drivers.driverDeleted'));
      navigate('/drivers', { replace: true });
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleSaveProfile = async () => {
    try {
      const values = await form.validateFields();
      await updateDriver({
        id,
        body: {
          fullName: values.fullName,
          birthDate: values.birthDate,
          residenceAddress: values.residenceAddress,
          drivingExperienceYears: values.drivingExperienceYears,
          vehicle: {
            make: values.vehicleMake,
            model: values.vehicleModel,
            plateNumber: values.vehiclePlateNumber,
            color: values.vehicleColor,
            year: values.vehicleYear,
          },
        },
      }).unwrap();
      message.success(t('drivers.driverUpdated'));
      setEditOpen(false);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(getErrorMessage(err));
    }
  };

  if (isLoading || !driver) return <PageLoader />;

  const isBlocked = driver.accountStatus === UserStatus.Blocked;
  const hasPendingDocuments = driver.documents.some((doc) => doc.status === DocumentStatus.Pending);
  const vehicle = driver.vehicles[0];

  return (
    <div>
      <PageHeader
        title={driver.fullName}
        subtitle={t('drivers.detailSubtitle')}
        extra={
          <Space wrap>
            {hasPendingDocuments ? (
              <Popconfirm title={t('drivers.approveAllHint')} onConfirm={() => void handleApproveAll()}>
                <Button type="primary" icon={<CheckOutlined />} loading={approving}>
                  {t('drivers.approveAll')}
                </Button>
              </Popconfirm>
            ) : null}
            <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              {t('drivers.editProfile')}
            </Button>
            <Button
              danger={!isBlocked}
              type={isBlocked ? 'default' : 'primary'}
              icon={isBlocked ? <UnlockOutlined /> : <StopOutlined />}
              loading={blocking}
              onClick={() => void handleToggleBlock()}
            >
              {isBlocked ? t('drivers.unblock') : t('drivers.block')}
            </Button>
            <Popconfirm
              title={t('drivers.deleteConfirm', { name: driver.fullName })}
              description={t('drivers.deleteHint')}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              onConfirm={() => void handleDelete()}
            >
              <Button danger icon={<DeleteOutlined />} loading={deleting}>
                {t('drivers.delete')}
              </Button>
            </Popconfirm>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/drivers')}>
              {t('common.back')}
            </Button>
          </Space>
        }
      />
      <RegionScopeBanner />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={t('drivers.profile')} bordered={false}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('drivers.phone')}>{formatPhone(driver.phone)}</Descriptions.Item>
              <Descriptions.Item label={t('drivers.verificationStatus')}>
                <VerificationStatusTag status={driver.verificationStatus} />
              </Descriptions.Item>
              <Descriptions.Item label={t('drivers.accountStatus')}>
                <Tag color={isBlocked ? 'red' : 'green'}>
                  {isBlocked ? t('drivers.accountBlocked') : t('drivers.accountActive')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('drivers.address')}>{driver.residenceAddress}</Descriptions.Item>
              <Descriptions.Item label={t('drivers.experience')}>
                {driver.drivingExperienceYears}
              </Descriptions.Item>
              <Descriptions.Item label={t('drivers.rating')}>{driver.rating.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label={t('drivers.trips')}>{driver.tripsCount}</Descriptions.Item>
            </Descriptions>
            {vehicle && (
              <>
                <Text strong style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>
                  {t('drivers.car')}
                </Text>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label={t('drivers.makeModel')}>
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </Descriptions.Item>
                  <Descriptions.Item label={t('drivers.plateNumber')}>{vehicle.plateNumber}</Descriptions.Item>
                  <Descriptions.Item label={t('drivers.color')}>{vehicle.color}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={t('drivers.documents')} bordered={false}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {driver.documents.map((doc: DriverDocument) => (
                <Card key={doc.id} size="small" type="inner">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag>{DOC_LABELS[doc.type] ?? doc.type}</Tag>
                      <DocumentStatusTag status={doc.status} />
                    </Space>
                    {doc.viewUrl && (
                      <Image
                        src={doc.viewUrl}
                        alt={doc.type}
                        style={{ maxHeight: 240, objectFit: 'contain', borderRadius: 8 }}
                      />
                    )}
                    {doc.rejectionReason && (
                      <Text type="danger">
                        {t('drivers.rejectReason')}: {doc.rejectionReason}
                      </Text>
                    )}
                    {doc.status === DocumentStatus.Pending && (
                      <Space>
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={moderating}
                          onClick={() => void handleApprove(doc.id)}
                        >
                          {t('common.approve')}
                        </Button>
                        <Button
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => setRejectModal({ docId: doc.id })}
                        >
                          {t('common.reject')}
                        </Button>
                      </Space>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title={t('drivers.editProfile')}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => void handleSaveProfile()}
        confirmLoading={updating}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="fullName" label={t('drivers.fullName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="birthDate" label={t('drivers.birthDate')}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="residenceAddress" label={t('drivers.address')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="drivingExperienceYears" label={t('drivers.experience')}>
            <InputNumber min={0} max={70} style={{ width: '100%' }} />
          </Form.Item>
          <Text strong>{t('drivers.car')}</Text>
          <Form.Item name="vehicleMake" label={t('drivers.makeModel')} style={{ marginTop: 12 }}>
            <Input placeholder="Hyundai" />
          </Form.Item>
          <Form.Item name="vehicleModel" label={t('drivers.vehicleModel')}>
            <Input placeholder="Solaris" />
          </Form.Item>
          <Form.Item name="vehiclePlateNumber" label={t('drivers.plateNumber')}>
            <Input />
          </Form.Item>
          <Form.Item name="vehicleColor" label={t('drivers.color')}>
            <Input />
          </Form.Item>
          <Form.Item name="vehicleYear" label={t('drivers.vehicleYear')}>
            <InputNumber min={1990} max={new Date().getFullYear() + 1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('drivers.rejectReason')}
        open={rejectModal !== null}
        onCancel={() => setRejectModal(null)}
        onOk={() => void handleReject()}
        confirmLoading={moderating}
        okButtonProps={{ disabled: !rejectReason.trim() }}
        okText={t('common.reject')}
        cancelText={t('common.cancel')}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('drivers.rejectReasonPlaceholder')}
        />
      </Modal>
    </div>
  );
}

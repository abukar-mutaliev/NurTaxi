import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StopOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { Button, Card, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useApproveDriverMutation,
  useBlockDriverMutation,
  useDeleteDriverMutation,
  useListDriversQuery,
  type DriverProfile,
} from '@/entities/driver';
import { useActiveRegionId } from '@/features/region-context';
import { DocumentStatus, UserStatus, VerificationStatus } from '@/shared/model/enums';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';
import { PageHeader, PageLoader, VerificationStatusTag, getVerificationStatusLabel } from '@/shared/ui';
import { formatPhone, getErrorMessage } from '@/shared/lib/utils';

const VERIFICATION_STATUSES = [
  VerificationStatus.Draft,
  VerificationStatus.Pending,
  VerificationStatus.InReview,
  VerificationStatus.Approved,
  VerificationStatus.Rejected,
] as const;

function hasPendingDocuments(driver: DriverProfile): boolean {
  return driver.documents.some((doc) => doc.status === DocumentStatus.Pending);
}

export function DriversPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const regionId = useActiveRegionId();
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | undefined>(undefined);
  const { data = [], isLoading } = useListDriversQuery({
    verificationStatus: statusFilter,
    regionId,
  });
  const [blockDriver] = useBlockDriverMutation();
  const [approveDriver] = useApproveDriverMutation();
  const [deleteDriver] = useDeleteDriverMutation();

  const handleToggleBlock = async (driver: DriverProfile) => {
    const isBlocked = driver.accountStatus === UserStatus.Blocked;
    try {
      await blockDriver({
        id: driver.id,
        status: isBlocked ? UserStatus.Active : UserStatus.Blocked,
      }).unwrap();
      message.success(isBlocked ? t('drivers.driverUnblocked') : t('drivers.driverBlocked'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleApprove = async (driver: DriverProfile) => {
    try {
      await approveDriver(driver.id).unwrap();
      message.success(t('drivers.driverApproved'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (driver: DriverProfile) => {
    try {
      await deleteDriver(driver.id).unwrap();
      message.success(t('drivers.driverDeleted'));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: ColumnsType<DriverProfile> = useMemo(
    () => [
      { title: t('drivers.fullName'), dataIndex: 'fullName', key: 'fullName' },
      {
        title: t('drivers.phone'),
        dataIndex: 'phone',
        key: 'phone',
        render: formatPhone,
      },
      {
        title: t('drivers.verificationStatus'),
        dataIndex: 'verificationStatus',
        key: 'verificationStatus',
        render: (s: DriverProfile['verificationStatus']) => <VerificationStatusTag status={s} />,
      },
      {
        title: t('drivers.account'),
        dataIndex: 'accountStatus',
        key: 'accountStatus',
        render: (status: string) => (
          <Tag color={status === UserStatus.Blocked ? 'red' : 'green'}>
            {status === UserStatus.Blocked ? t('drivers.accountBlocked') : t('drivers.accountActive')}
          </Tag>
        ),
      },
      {
        title: t('drivers.experience'),
        dataIndex: 'drivingExperienceYears',
        key: 'drivingExperienceYears',
      },
      {
        title: t('drivers.trips'),
        dataIndex: 'tripsCount',
        key: 'tripsCount',
      },
      {
        title: t('drivers.rating'),
        dataIndex: 'rating',
        key: 'rating',
        render: (v: number) => v.toFixed(2),
      },
      {
        title: t('common.actions'),
        key: 'actions',
        width: 320,
        render: (_, record) => {
          const isBlocked = record.accountStatus === UserStatus.Blocked;
          const canApprove = hasPendingDocuments(record);

          return (
            <Space wrap size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/drivers/${record.id}`)}
              >
                {t('drivers.open')}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/drivers/${record.id}?edit=1`)}
              >
                {t('drivers.edit')}
              </Button>
              {canApprove ? (
                <Popconfirm
                  title={t('drivers.approveAllHint')}
                  onConfirm={() => void handleApprove(record)}
                >
                  <Button type="link" size="small" icon={<CheckOutlined />}>
                    {t('drivers.approve')}
                  </Button>
                </Popconfirm>
              ) : null}
              <Button
                type="link"
                size="small"
                danger={!isBlocked}
                icon={isBlocked ? <UnlockOutlined /> : <StopOutlined />}
                onClick={() => void handleToggleBlock(record)}
              >
                {isBlocked ? t('drivers.unblock') : t('drivers.block')}
              </Button>
              <Popconfirm
                title={t('drivers.deleteConfirm', { name: record.fullName })}
                description={t('drivers.deleteHint')}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                onConfirm={() => void handleDelete(record)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  {t('drivers.delete')}
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [navigate, t],
  );

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t('drivers.title')}
        subtitle={t('drivers.subtitle')}
        extra={
          <Select
            allowClear
            placeholder={t('drivers.verificationFilter')}
            style={{ width: 240 }}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={VERIFICATION_STATUSES.map((status) => ({
              value: status,
              label: getVerificationStatusLabel(status),
            }))}
          />
        }
      />
      <RegionScopeBanner />
      <Card bordered={false}>
        <Table rowKey="id" columns={columns} dataSource={data} pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
}

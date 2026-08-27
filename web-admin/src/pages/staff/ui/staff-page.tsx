import { UserAddOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/store/hooks';
import { useListRegionsQuery } from '@/entities/region';
import {
  useAssignStaffMutation,
  useListStaffQuery,
  useRemoveStaffMutation,
  useRevokeStaffMutation,
  useSetStaffStatusMutation,
  type StaffMember,
} from '@/entities/staff';
import { useActiveRegionId } from '@/features/region-context';
import { Role, UserStatus } from '@/shared/model/enums';
import { roleLabel } from '@/shared/rbac';
import { PageHeader, PageLoader, ActiveTag } from '@/shared/ui';
import { formatPhone, getErrorMessage, normalizePhoneInput } from '@/shared/lib/utils';

export function StaffPage() {
  const currentUserId = useAppSelector((s) => s.session.user?.id);
  const regionId = useActiveRegionId();
  const { data = [], isLoading, refetch } = useListStaffQuery(regionId ? { regionId } : undefined);
  const { data: regions = [] } = useListRegionsQuery();
  const [assignStaff, { isLoading: assigning }] = useAssignStaffMutation();
  const [revokeStaff, { isLoading: revoking }] = useRevokeStaffMutation();
  const [removeStaff, { isLoading: removing }] = useRemoveStaffMutation();
  const [setStaffStatus, { isLoading: blocking }] = useSetStaffStatusMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleToggleBlock = async (member: StaffMember) => {
    const next = member.status === UserStatus.Blocked ? UserStatus.Active : UserStatus.Blocked;
    try {
      await setStaffStatus({ id: member.id, status: next }).unwrap();
      message.success(next === UserStatus.Blocked ? 'Аккаунт заблокирован' : 'Аккаунт разблокирован');
      void refetch();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleRevoke = async (member: StaffMember) => {
    try {
      await revokeStaff(member.id).unwrap();
      message.success('Права администратора отозваны');
      void refetch();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleRemove = async (member: StaffMember) => {
    try {
      await removeStaff(member.id).unwrap();
      message.success('Администратор удалён');
      void refetch();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: ColumnsType<StaffMember> = useMemo(
    () => [
      { title: 'Имя', dataIndex: 'name', key: 'name', render: (v) => v ?? '—' },
      { title: 'Телефон', dataIndex: 'phone', key: 'phone', render: formatPhone },
      {
        title: 'Роль',
        dataIndex: 'role',
        key: 'role',
        render: (role: StaffMember['role']) => <Tag color="blue">{roleLabel(role)}</Tag>,
      },
      {
        title: 'Регион',
        dataIndex: 'assignedRegionId',
        key: 'assignedRegionId',
        render: (id: string | null) => regions.find((r) => r.id === id)?.name ?? id ?? '—',
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => <ActiveTag active={status === UserStatus.Active} />,
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 320,
        render: (_, record) => {
          const isSelf = record.id === currentUserId;
          return (
            <Space wrap size="small">
              <Popconfirm
                title={
                  record.status === UserStatus.Blocked
                    ? 'Разблокировать аккаунт?'
                    : 'Заблокировать аккаунт?'
                }
                onConfirm={() => void handleToggleBlock(record)}
                disabled={isSelf}
              >
                <Button type="link" danger={record.status !== UserStatus.Blocked} loading={blocking} disabled={isSelf}>
                  {record.status === UserStatus.Blocked ? 'Разблокировать' : 'Заблокировать'}
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Отозвать права администратора?"
                description="Пользователь станет обычным клиентом и исчезнет из этого списка."
                onConfirm={() => void handleRevoke(record)}
                disabled={isSelf}
              >
                <Button type="link" loading={revoking} disabled={isSelf}>
                  Отозвать
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Удалить аккаунт безвозвратно?"
                description="Если у пользователя есть связанные данные, удаление может быть недоступно."
                okText="Удалить"
                okButtonProps={{ danger: true }}
                onConfirm={() => void handleRemove(record)}
                disabled={isSelf}
              >
                <Button type="link" danger loading={removing} disabled={isSelf}>
                  Удалить
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [blocking, currentUserId, regions, revoking, removing],
  );

  const handleAssign = async () => {
    try {
      const values = await form.validateFields();
      await assignStaff({
        phone: normalizePhoneInput(values.phone),
        name: values.name?.trim() || undefined,
        role: values.role,
        regionId: values.regionId,
      }).unwrap();
      message.success('Администратор назначен');
      setOpen(false);
      form.resetFields();
      void refetch();
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'errorFields' in err) return;
      message.error(getErrorMessage(err));
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Администраторы"
        subtitle="Назначение, блокировка, отзыв и удаление операторов и региональных администраторов"
        extra={
          <Space>
            <Link to="/audit">
              <Button>Журнал аудита</Button>
            </Link>
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setOpen(true)}>
              Назначить администратора
            </Button>
          </Space>
        }
      />
      {!regionId && (
        <Alert
          type="info"
          showIcon
          message="Показаны все администраторы. Выберите регион для фильтрации."
          style={{ marginBottom: 16 }}
        />
      )}
      <Card bordered={false}>
        <Table rowKey="id" columns={columns} dataSource={data} scroll={{ x: 1100 }} />
      </Card>

      <Modal
        title="Назначить администратора"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleAssign()}
        confirmLoading={assigning}
        okText="Назначить"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="phone"
            label="Телефон"
            rules={[
              { required: true, message: 'Укажите телефон' },
              {
                validator: (_, value: string | undefined) => {
                  const normalized = normalizePhoneInput(value ?? '');
                  if (normalized.length === 12 && normalized.startsWith('+7')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Введите номер в формате +7XXXXXXXXXX'));
                },
              },
            ]}
            extra="Например +79280000001. Если пользователя нет, аккаунт будет создан автоматически. Нельзя назначить супер-админа или водителя."
          >
            <Input placeholder="+79280000001" />
          </Form.Item>
          <Form.Item name="name" label="Имя">
            <Input placeholder="Иван Иванов" />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={[
                { value: Role.Operator, label: roleLabel(Role.Operator) },
                { value: Role.RegionalAdmin, label: roleLabel(Role.RegionalAdmin) },
                { value: Role.Regulator, label: roleLabel(Role.Regulator) },
              ]}
            />
          </Form.Item>
          <Form.Item name="regionId" label="Регион" rules={[{ required: true }]}>
            <Select options={regions.map((r) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

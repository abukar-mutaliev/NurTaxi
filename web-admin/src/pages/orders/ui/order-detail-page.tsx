import { ArrowLeftOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useAssignDriverMutation,
  useChangeStatusMutation,
  useGetNearbyDriversQuery,
  useGetOrderQuery,
  useGetOrderStatusLogsQuery,
  useRefundOrderMutation,
} from '@/entities/order';
import { useOrderRealtime } from '@/features/realtime';
import { PageHeader, PageLoader, OrderStatusTag, getOrderStatusLabel, getOrderStatusSelectOptions } from '@/shared/ui';
import { OrderRouteMap } from '@/widgets/order-route-map';
import { formatDistance } from '@/shared/lib/polyline';
import { createIdempotencyKey, formatCurrency, formatDate, getErrorMessage } from '@/shared/lib/utils';

const { Text } = Typography;

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: order, isLoading } = useGetOrderQuery(id, { skip: !id });
  const { data: statusLogs = [] } = useGetOrderStatusLogsQuery(id, { skip: !id });
  const { data: nearbyDrivers = [], refetch: refetchNearby } = useGetNearbyDriversQuery(id, {
    skip: !id || !order,
  });
  const { driverPosition } = useOrderRealtime(id);
  const [assignDriver, { isLoading: assigning }] = useAssignDriverMutation();
  const [changeStatus, { isLoading: changingStatus }] = useChangeStatusMutation();
  const [refundOrder, { isLoading: refunding }] = useRefundOrderMutation();
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [mapMounted, setMapMounted] = useState(false);
  const [assignForm] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  useEffect(() => setMapMounted(true), []);

  useEffect(() => {
    if (assignOpen) void refetchNearby();
  }, [assignOpen, refetchNearby]);

  const driverOnMap = useMemo(() => {
    if (driverPosition) {
      return {
        lat: driverPosition.lat,
        lng: driverPosition.lng,
        label: order?.driver?.fullName ?? 'Водитель',
      };
    }
    if (order?.driver && nearbyDrivers.length) {
      const match = nearbyDrivers.find((d) => d.driverId === order.driver?.id);
      if (match) {
        return { lat: match.lat, lng: match.lng, label: order.driver.fullName };
      }
    }
    return null;
  }, [driverPosition, order, nearbyDrivers]);

  const candidateMarkers = useMemo(
    () =>
      assignOpen
        ? nearbyDrivers.map((d) => ({
            id: d.driverId,
            lat: d.lat,
            lng: d.lng,
            color: selectedDriverId === d.driverId ? '#E0A008' : '#7B61FF',
            label: `${d.fullName} · ${formatDistance(d.distanceM)}`,
            onClick: () => {
              setSelectedDriverId(d.driverId);
              assignForm.setFieldValue('driverId', d.driverId);
            },
          }))
        : [],
    [assignOpen, nearbyDrivers, selectedDriverId, assignForm],
  );

  if (isLoading || !order) return <PageLoader />;

  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await assignDriver({ id, body: { driverId: values.driverId } }).unwrap();
      message.success('Водитель назначен');
      setAssignOpen(false);
      setSelectedDriverId(null);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleStatusChange = async () => {
    try {
      const values = await statusForm.validateFields();
      await changeStatus({ id, body: values }).unwrap();
      message.success('Статус обновлён');
      setStatusOpen(false);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleRefund = async () => {
    try {
      const values = await refundForm.validateFields();
      await refundOrder({
        id,
        body: {
          amount: values.amount,
          reason: values.reason,
          idempotencyKey: createIdempotencyKey(),
        },
      }).unwrap();
      message.success('Возврат оформлен');
      setRefundOpen(false);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title={`Заказ ${order.id.slice(0, 8)}…`}
        subtitle={formatDate(order.createdAt)}
        extra={
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
              Назад
            </Button>
            <Button onClick={() => setAssignOpen(true)}>{t('orders.assignDriver')}</Button>
            <Button onClick={() => setStatusOpen(true)}>{t('orders.changeStatus')}</Button>
            <Button danger onClick={() => setRefundOpen(true)}>
              {t('orders.refund')}
            </Button>
          </Space>
        }
      />

      <Card title="Карта маршрута" bordered={false} style={{ marginBottom: 16 }}>
        {mapMounted ? (
          <OrderRouteMap
            pickup={{ lat: order.pickupLat, lng: order.pickupLng, label: 'A' }}
            dropoff={{ lat: order.dropoffLat, lng: order.dropoffLng, label: 'B' }}
            polyline={order.route?.polyline}
            driver={driverOnMap}
            height={380}
          />
        ) : (
          <div style={{ height: 380 }} />
        )}
        {order.route ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {formatDistance(order.route.distanceM)} · ~{Math.round(order.route.durationS / 60)} мин
          </Text>
        ) : null}
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Детали" bordered={false}>
            <Descriptions column={1}>
              <Descriptions.Item label={t('orders.pickup')}>{order.pickupAddress}</Descriptions.Item>
              <Descriptions.Item label={t('orders.dropoff')}>{order.dropoffAddress}</Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>
                <OrderStatusTag status={order.status} />
              </Descriptions.Item>
              <Descriptions.Item label={t('orders.price')}>
                {formatCurrency(order.priceFinal ?? order.priceEstimated)}
              </Descriptions.Item>
              <Descriptions.Item label="Оплата">{order.paymentMethod}</Descriptions.Item>
              {order.comment ? (
                <Descriptions.Item label="Комментарий">{order.comment}</Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={t('orders.driver')} bordered={false} style={{ marginBottom: 16 }}>
            {order.driver ? (
              <Descriptions column={1}>
                <Descriptions.Item label="ФИО">{order.driver.fullName}</Descriptions.Item>
                <Descriptions.Item label="Телефон">{order.driver.phone ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Рейтинг">{order.driver.rating.toFixed(2)}</Descriptions.Item>
                {order.driver.vehicle ? (
                  <Descriptions.Item label="Авто">
                    {order.driver.vehicle.make} {order.driver.vehicle.model},{' '}
                    {order.driver.vehicle.plateNumber}
                  </Descriptions.Item>
                ) : null}
              </Descriptions>
            ) : (
              <p>Водитель не назначен</p>
            )}
          </Card>
          <Card title="История статусов" bordered={false}>
            <Timeline
              items={statusLogs.map((log) => ({
                children: (
                  <div>
                    <div>
                      <OrderStatusTag status={log.toStatus} />
                      {log.fromStatus ? (
                        <Text type="secondary"> ← {getOrderStatusLabel(log.fromStatus)}</Text>
                      ) : null}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(log.createdAt)}
                      {log.actorLabel ? ` · ${log.actorLabel}` : ''}
                      {log.reason ? ` · ${log.reason}` : ''}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={t('orders.assignDriver')}
        open={assignOpen}
        onCancel={() => {
          setAssignOpen(false);
          setSelectedDriverId(null);
        }}
        onOk={() => void handleAssign()}
        confirmLoading={assigning}
        width={720}
      >
        {mapMounted ? (
          <OrderRouteMap
            pickup={{ lat: order.pickupLat, lng: order.pickupLng }}
            dropoff={{ lat: order.dropoffLat, lng: order.dropoffLng }}
            polyline={order.route?.polyline}
            candidates={candidateMarkers}
            height={280}
          />
        ) : null}
        <Form form={assignForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="driverId" label="Ближайший водитель" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Выберите на карте или из списка"
              options={nearbyDrivers.map((d) => ({
                value: d.driverId,
                label: `${d.fullName} · ${formatDistance(d.distanceM)} · ★ ${d.rating.toFixed(1)}`,
              }))}
              onChange={(value) => setSelectedDriverId(value)}
            />
          </Form.Item>
        </Form>
        {nearbyDrivers.length === 0 ? (
          <Text type="secondary">Нет онлайн-водителей рядом с точкой подачи</Text>
        ) : null}
      </Modal>

      <Modal
        title={t('orders.changeStatus')}
        open={statusOpen}
        onCancel={() => setStatusOpen(false)}
        onOk={() => void handleStatusChange()}
        confirmLoading={changingStatus}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="Новый статус" rules={[{ required: true }]}>
            <Select options={getOrderStatusSelectOptions()} />
          </Form.Item>
          <Form.Item name="reason" label="Причина">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('orders.refund')}
        open={refundOpen}
        onCancel={() => setRefundOpen(false)}
        onOk={() => void handleRefund()}
        confirmLoading={refunding}
      >
        <Form form={refundForm} layout="vertical">
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <InputNumber min={0.01} style={{ width: '100%' }} addonAfter="₽" />
          </Form.Item>
          <Form.Item name="reason" label="Причина">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

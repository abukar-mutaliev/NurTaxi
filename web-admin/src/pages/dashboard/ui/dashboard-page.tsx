import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  LineChartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Row, Space, Statistic } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetSummaryQuery } from '@/entities/analytics';
import { useRegionScope } from '@/features/region-context';
import { RegionScopeBanner } from '@/widgets/region-scope-banner';
import { AnalyticsReports } from '@/widgets/analytics-reports';
import { PageHeader, PageLoader, KpiCard } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib/utils';
import { palette } from '@/shared/config/theme';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const { RangePicker } = DatePicker;

export function DashboardPage() {
  const { t } = useTranslation();
  const { regionId, regionName, isRegionLocked } = useRegionScope();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day').startOf('day'),
    dayjs().endOf('day'),
  ]);

  const queryParams = useMemo(
    () => ({
      regionId,
      from: range[0].toISOString(),
      to: range[1].toISOString(),
    }),
    [regionId, range],
  );

  const { data, isLoading, isFetching, refetch } = useGetSummaryQuery(queryParams);

  if (isLoading) return <PageLoader />;

  const subtitle = regionName
    ? isRegionLocked
      ? `Статистика региона «${regionName}»`
      : `Показатели региона «${regionName}»`
    : 'Ключевые показатели платформы — выберите регион для детализации';

  const chartData = data
    ? [
        { name: 'Активные', value: data.orders.active },
        { name: 'Завершённые', value: data.orders.completed },
        { name: 'Отменённые', value: data.orders.cancelled },
      ]
    : [];

  const kpi = data?.kpi;
  const assignmentOk =
    kpi?.avgAssignmentSeconds != null &&
    kpi.avgAssignmentSeconds <= kpi.assignmentTargetSeconds;

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={subtitle}
        extra={
          <Space wrap>
            <RangePicker
              value={range}
              onChange={(values) => {
                if (values?.[0] && values[1]) setRange([values[0].startOf('day'), values[1].endOf('day')]);
              }}
              allowClear={false}
              format="DD.MM.YYYY"
            />
            <Button onClick={() => void refetch()} loading={isFetching}>
              {t('common.refresh')}
            </Button>
          </Space>
        }
      />
      <RegionScopeBanner />

      {kpi ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Назначение водителя"
              value={
                kpi.avgAssignmentSeconds != null ? `${kpi.avgAssignmentSeconds} сек` : '—'
              }
              icon={<ClockCircleOutlined />}
              subtitle="Среднее время от создания заказа"
              targetLabel={`Цель KPI: ≤ ${kpi.assignmentTargetSeconds} сек`}
              percent={
                kpi.avgAssignmentSeconds != null
                  ? Math.min(
                      100,
                      Math.round(
                        (kpi.assignmentTargetSeconds / kpi.avgAssignmentSeconds) * 100,
                      ),
                    )
                  : undefined
              }
              status={assignmentOk ? 'success' : kpi.avgAssignmentSeconds != null ? 'exception' : 'normal'}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Успешные заказы"
              value={`${kpi.orderSuccessRate}%`}
              icon={<CheckCircleOutlined />}
              subtitle="Завершённые / (завершённые + отменённые)"
              percent={kpi.orderSuccessRate}
              status={kpi.orderSuccessRate >= 80 ? 'success' : 'normal'}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Успешные платежи"
              value={`${kpi.paymentSuccessRate}%`}
              icon={<DollarOutlined />}
              subtitle="Успешные / все попытки оплаты"
              percent={kpi.paymentSuccessRate}
              status={kpi.paymentSuccessRate >= 95 ? 'success' : 'normal'}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Доступность водителей"
              value={`${kpi.driverAvailabilityRate}%`}
              icon={<ThunderboltOutlined />}
              subtitle="Онлайн / одобренные водители"
              percent={kpi.driverAvailabilityRate}
            />
          </Col>
        </Row>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title={t('dashboard.ordersTotal')}
              value={data?.orders.total ?? 0}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title={t('dashboard.ordersActive')}
              value={data?.orders.active ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: palette.gold }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title={t('dashboard.ordersCompleted')}
              value={data?.orders.completed ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: palette.green600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title={t('dashboard.driversOnline')}
              value={data?.drivers.online ?? 0}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Водители (всего)"
              value={data?.drivers.total ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="На модерации"
              value={data?.drivers.pending ?? 0}
              valueStyle={{ color: palette.amber500 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title={t('dashboard.paymentsTotal')}
              value={formatCurrency(data?.payments.totalAmount ?? 0)}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Успешных платежей"
              value={data?.payments.succeededCount ?? 0}
              suffix={
                data?.payments.failedCount
                  ? `/ ${data.payments.failedCount} ошибок`
                  : undefined
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <LineChartOutlined />
                Динамика заказов
              </Space>
            }
            bordered={false}
          >
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={data?.timeseries ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => dayjs(v).format('DD.MM')}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(v) => dayjs(String(v)).format('DD MMM YYYY')} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    name="Заказы"
                    stroke={palette.gold}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Завершённые"
                    stroke={palette.green600}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Заказы по статусам" bordered={false}>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={palette.gold} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <AnalyticsReports from={queryParams.from} to={queryParams.to} />
    </div>
  );
}

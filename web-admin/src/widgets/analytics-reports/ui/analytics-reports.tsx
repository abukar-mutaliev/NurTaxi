import { DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, message } from 'antd';
import dayjs from 'dayjs';
import { useLazyGetReportQuery, type AdminReportType } from '@/entities/analytics';
import { useRegionScope } from '@/features/region-context';
import { downloadCsv } from '@/shared/lib/export-csv';
import { getErrorMessage } from '@/shared/lib/utils';

interface AnalyticsReportsProps {
  from: string;
  to: string;
}

const REPORTS: { type: AdminReportType; label: string; filename: string }[] = [
  { type: 'orders', label: 'Заказы', filename: 'orders-report.csv' },
  { type: 'drivers', label: 'Водители', filename: 'drivers-report.csv' },
  { type: 'finance', label: 'Финансы', filename: 'finance-report.csv' },
];

export function AnalyticsReports({ from, to }: AnalyticsReportsProps) {
  const { regionId } = useRegionScope();
  const [fetchReport, { isFetching }] = useLazyGetReportQuery();

  const handleExport = async (type: AdminReportType, filename: string) => {
    try {
      const query =
        type === 'drivers'
          ? { type, regionId }
          : { type, regionId, from, to };

      const rows = await fetchReport(query).unwrap();

      if (rows.length === 0) {
        message.info('Нет данных для экспорта');
        return;
      }

      const datedFilename = filename.replace('.csv', `-${dayjs().format('YYYY-MM-DD')}.csv`);
      downloadCsv(rows, datedFilename);
      message.success('Отчёт скачан');
    } catch (err) {
      message.error(getErrorMessage(err, 'Не удалось сформировать отчёт'));
    }
  };

  return (
    <Card title="Экспорт отчётов" bordered={false} style={{ marginTop: 24 }}>
      <Row gutter={[12, 12]}>
        {REPORTS.map((report) => (
          <Col xs={24} sm={8} key={report.type}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <span>{report.label}</span>
              <Button
                icon={<DownloadOutlined />}
                loading={isFetching}
                onClick={() => void handleExport(report.type, report.filename)}
                block
              >
                CSV
              </Button>
            </Space>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

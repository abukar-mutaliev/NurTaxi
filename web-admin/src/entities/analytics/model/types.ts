export interface AdminAnalyticsKpi {
  avgAssignmentSeconds: number | null;
  assignmentTargetSeconds: number;
  orderSuccessRate: number;
  paymentSuccessRate: number;
  driverAvailabilityRate: number;
}

export interface AdminAnalyticsTimeseriesPoint {
  date: string;
  orders: number;
  completed: number;
  revenue: number;
}

export interface AdminAnalyticsSummary {
  regionId?: string;
  period: { from: string; to: string };
  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  payments: {
    succeededCount: number;
    failedCount: number;
    totalAmount: number;
  };
  drivers: {
    total: number;
    approved: number;
    pending: number;
    online: number;
  };
  kpi: AdminAnalyticsKpi;
  timeseries: AdminAnalyticsTimeseriesPoint[];
}

export type AdminReportType = 'orders' | 'drivers' | 'finance';

export type AdminReportRow = Record<string, string | number | null>;

export interface AnalyticsQueryParams {
  regionId?: string;
  from?: string;
  to?: string;
}

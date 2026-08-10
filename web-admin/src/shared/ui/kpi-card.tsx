import { Card, Progress, Typography } from 'antd';
import type { ReactNode } from 'react';
import { palette } from '@/shared/config/theme';
import styles from './kpi-card.module.css';

const { Text } = Typography;

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  percent?: number;
  status?: 'success' | 'normal' | 'exception';
  targetLabel?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  percent,
  status = 'normal',
  targetLabel,
}: KpiCardProps) {
  return (
    <Card bordered={false} className={styles.card}>
      <div className={styles.header}>
        <Text type="secondary" className={styles.title}>
          {title}
        </Text>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
      </div>
      <div className={styles.value}>{value}</div>
      {subtitle ? (
        <Text type="secondary" className={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
      {percent !== undefined ? (
        <Progress
          percent={Math.min(percent, 100)}
          status={status}
          showInfo
          strokeColor={
            status === 'success'
              ? palette.green600
              : status === 'exception'
                ? palette.red500
                : palette.gold
          }
          style={{ marginTop: 12 }}
        />
      ) : null}
      {targetLabel ? (
        <Text type="secondary" className={styles.target}>
          {targetLabel}
        </Text>
      ) : null}
    </Card>
  );
}

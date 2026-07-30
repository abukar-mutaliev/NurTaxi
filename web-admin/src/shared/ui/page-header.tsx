import { Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}

export function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          {title}
        </Title>
        {subtitle ? (
          <Text type="secondary" style={{ fontSize: 15 }}>
            {subtitle}
          </Text>
        ) : null}
      </div>
      {extra ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{extra}</div> : null}
    </div>
  );
}

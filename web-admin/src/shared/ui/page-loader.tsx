import { Spin } from 'antd';

interface PageLoaderProps {
  tip?: string;
}

export function PageLoader({ tip }: PageLoaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        width: '100%',
      }}
    >
      <Spin size="large" tip={tip} />
    </div>
  );
}

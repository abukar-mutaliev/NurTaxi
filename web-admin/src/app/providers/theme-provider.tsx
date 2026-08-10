import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { antTheme } from '@/shared/config/theme';
import type { ReactNode } from 'react';

interface AppThemeProviderProps {
  children: ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ConfigProvider theme={antTheme} locale={ruRU}>
      {children}
    </ConfigProvider>
  );
}

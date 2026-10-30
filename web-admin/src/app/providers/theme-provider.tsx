import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { antTheme, applyCssVariables } from '@/shared/config/theme';
import type { ReactNode } from 'react';

// CSS-модули берут цвета из переменных `--nur-*` — ставим их до первой отрисовки.
applyCssVariables();

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

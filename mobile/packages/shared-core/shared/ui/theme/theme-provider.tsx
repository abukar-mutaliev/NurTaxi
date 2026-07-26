import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Принудительная схема. По умолчанию следует системной настройке устройства. */
  scheme?: 'light' | 'dark';
}

export function ThemeProvider({ children, scheme }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const resolved = scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => (resolved === 'dark' ? darkTheme : lightTheme), [resolved]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

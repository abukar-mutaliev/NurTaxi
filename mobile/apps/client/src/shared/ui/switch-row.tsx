import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS } from './glass-theme';

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void | Promise<unknown>;
  disabled?: boolean;
}

export function SwitchRow({ title, subtitle, value, onValueChange, disabled }: SwitchRowProps) {
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (pendingValue !== null && pendingValue === value) {
      setPendingValue(null);
    }
  }, [pendingValue, value]);

  const handleValueChange = (next: boolean) => {
    setPendingValue(next);
    void Promise.resolve(onValueChange(next)).catch(() => {
      if (valueRef.current !== next) {
        setPendingValue(null);
      }
    });
  };

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        disabled={disabled}
        onValueChange={handleValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: '#D8D0C8', true: GLASS_COLORS.switchActive }}
        value={pendingValue ?? value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  subtitle: {
    color: GLASS_COLORS.subtitle,
    fontSize: 12,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: GLASS_COLORS.title,
    fontSize: 15,
    fontWeight: '500',
  },
});

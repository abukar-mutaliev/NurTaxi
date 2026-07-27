/**
 * Технологическая заглушка для ещё не реализованных экранов.
 */
import { View } from 'react-native';

import { Badge, Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS } from './glass-theme';
import { GlassCard } from './glass-card';
import { GlassCaption, GlassScreenShell } from './glass-screen-shell';

export interface PlaceholderScreenProps {
  task: string;
  title: string;
  description?: string;
  endpoints?: string[];
  showBack?: boolean;
}

export function PlaceholderScreen({
  task,
  title,
  description,
  endpoints = [],
  showBack = false,
}: PlaceholderScreenProps) {
  return (
    <GlassScreenShell showBack={showBack} title={showBack ? title : undefined}>
      <GlassCard>
        <Badge label={task} tone="warning" />
        {!showBack ? (
          <Text style={{ color: GLASS_COLORS.title, fontSize: 20, fontWeight: '600' }}>
            {title}
          </Text>
        ) : null}
        {description ? <GlassCaption>{description}</GlassCaption> : null}

        {endpoints.length > 0 ? (
          <View style={{ gap: 6, paddingTop: 8 }}>
            <Text style={{ color: GLASS_COLORS.title, fontSize: 13, fontWeight: '600' }}>API</Text>
            {endpoints.map((endpoint) => (
              <GlassCaption key={endpoint}>{endpoint}</GlassCaption>
            ))}
          </View>
        ) : null}
      </GlassCard>
    </GlassScreenShell>
  );
}

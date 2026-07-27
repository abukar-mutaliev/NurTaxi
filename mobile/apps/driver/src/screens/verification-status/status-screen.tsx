/**
 * Статус верификации водителя (M7.3).
 *
 * Показывает текущий статус проверки (`pending / in_review / approved / rejected`),
 * причину отклонения и даёт повторно подать документы. Пока статус не `approved`,
 * guard-навигация не выпускает водителя из группы `(verification)` (M7.4).
 */
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  Badge,
  Button,
  Card,
  Loader,
  Screen,
  Text,
  useTheme,
} from '@nurtaxi/shared-core/shared/ui';
import { useGetDriverProfileQuery } from '@nurtaxi/shared-core/entities/driver';

type StatusView = {
  title: string;
  subtitle: string;
  tone: 'warning' | 'success' | 'danger';
  badge: string;
};

const STATUS_VIEW: Record<string, StatusView> = {
  pending: {
    title: 'Документы отправлены',
    subtitle: 'Ожидают проверки модератором.',
    tone: 'warning',
    badge: 'Ожидает',
  },
  in_review: {
    title: 'Документы на проверке',
    subtitle: 'Обычно занимает до 24 часов. Пришлём уведомление о решении.',
    tone: 'warning',
    badge: 'На проверке',
  },
  approved: {
    title: 'Вы проверены',
    subtitle: 'Можно выходить на линию и принимать заказы.',
    tone: 'success',
    badge: 'Одобрено',
  },
  rejected: {
    title: 'Документы отклонены',
    subtitle: 'Исправьте замечания и подайте повторно.',
    tone: 'danger',
    badge: 'Отклонено',
  },
};

export function VerificationStatusScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: profile, isLoading, isFetching, refetch } = useGetDriverProfileQuery();

  if (isLoading || !profile) {
    return (
      <Screen>
        <Loader />
      </Screen>
    );
  }

  const status = profile.verificationStatus;
  const view: StatusView = STATUS_VIEW[status] ?? {
    title: 'Проверка документов',
    subtitle: 'Статус уточняется…',
    tone: 'warning',
    badge: 'Проверка',
  };
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';

  return (
    <Screen
      footer={
        isRejected ? (
          <Button
            onPress={() => router.replace('/(verification)/documents')}
            title="Подать повторно"
          />
        ) : isApproved ? (
          <Button onPress={() => router.replace('/(tabs)')} title="Выйти на линию" />
        ) : undefined
      }
    >
      <ScrollView
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        contentContainerStyle={{ gap: theme.spacing.md, paddingTop: theme.spacing.xxl }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Badge label={view.badge} tone={view.tone} />
          <Text align="center" variant="title">
            {view.title}
          </Text>
          <Text align="center" tone="muted">
            {view.subtitle}
          </Text>
        </View>

        {isRejected && profile.rejectionReason ? (
          <Card tone="danger">
            <Text tone="danger" variant="bodyStrong">
              Причина отклонения
            </Text>
            <Text tone="muted" variant="caption">
              {profile.rejectionReason}
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text variant="bodyStrong">{profile.fullName}</Text>
          {profile.vehicles?.[0] ? (
            <Text tone="muted" variant="caption">
              {profile.vehicles[0].make} {profile.vehicles[0].model} ·{' '}
              {profile.vehicles[0].plateNumber}
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

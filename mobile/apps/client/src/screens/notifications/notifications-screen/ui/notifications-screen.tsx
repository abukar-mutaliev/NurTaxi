/**
 * Центр in-app уведомлений (M10.3, Req §23).
 */
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateTime } from '@nurtaxi/shared-core/shared/lib';
import { Badge, Text } from '@nurtaxi/shared-core/shared/ui';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@nurtaxi/shared-core/entities/notification';
import { resolveNotificationHref } from '@nurtaxi/shared-core/features/notifications';

import { WelcomeGradientBackground } from '@/screens/auth/welcome-screen/ui/welcome-gradient-background';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenHeader,
  GlassScreenShell,
} from '@/shared/ui';

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetNotificationsQuery({
    limit: 50,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, markAllState] = useMarkAllNotificationsReadMutation();

  const unreadCount = data.filter((item) => !item.readAt).length;

  const openNotification = async (id: string, type: string, payload: Record<string, unknown>) => {
    if (!data.find((item) => item.id === id)?.readAt) {
      void markRead(id);
    }
    const href = resolveNotificationHref(type, payload);
    if (href) {
      router.push(href);
    }
  };

  if (isLoading) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (isError) {
    return (
      <GlassScreenShell error={error} isError onRetry={refetch} retryLabel={t('common.retry')} />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeGradientBackground />
      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.ellipse,
          {
            height: scale * 560,
            left: scale * -90,
            top: scale * -200,
            width: scale * 560,
          },
        ]}
      />

      <FlatList
        ListEmptyComponent={
          <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 14, textAlign: 'center' }}>
            {t('notifications.empty')}
          </Text>
        }
        ListHeaderComponent={
          <View style={{ gap: scale * 14, paddingTop: insets.top + scale * 10 }}>
            <GlassScreenHeader title={t('notifications.title')} />
            {unreadCount > 0 ? (
              <GlassPrimaryButton
                disabled={markAllState.isLoading}
                loading={markAllState.isLoading}
                loadingTitle={t('common.loading')}
                onPress={() => {
                  void markAllRead();
                }}
                scale={scale}
                title={t('notifications.markAllRead')}
                variant="secondary"
              />
            ) : null}
          </View>
        }
        contentContainerStyle={{
          gap: scale * 12,
          paddingBottom: insets.bottom + scale * 24,
          paddingHorizontal: scale * 16,
        }}
        data={data}
        keyExtractor={(item) => item.id}
        onRefresh={refetch}
        refreshing={isFetching}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              void openNotification(item.id, item.type, item.data);
            }}
          >
            <GlassCard tone={item.readAt ? 'default' : 'selected'}>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: GLASS_COLORS.title,
                    flex: 1,
                    fontSize: scale * 15,
                    fontWeight: '600',
                  }}
                >
                  {item.title}
                </Text>
                {!item.readAt ? <Badge label={t('notifications.unread')} tone="primary" /> : null}
              </View>
              <GlassCaption>{item.body}</GlassCaption>
              <Text style={{ color: GLASS_COLORS.hint, fontSize: scale * 11 }}>
                {formatDateTime(item.createdAt)}
              </Text>
            </GlassCard>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ellipse: {
    position: 'absolute',
  },
  root: {
    backgroundColor: GLASS_COLORS.background,
    flex: 1,
  },
});

/**
 * Избранные адреса: список, добавление, удаление (M3.6, Figma node 39:997).
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatShortDisplayAddress } from '@nurtaxi/shared-core/shared/lib';
import { ErrorView, Loader, Text } from '@nurtaxi/shared-core/shared/ui';
import {
  useDeleteSavedAddressMutation,
  useGetSavedAddressesQuery,
} from '@nurtaxi/shared-core/entities/saved-address';

import { GlassAddIconButton, GlassConfirmDialog, GlassScreenHeader } from '@/shared/ui';
import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';
import { AddSavedAddressRow } from './add-saved-address-row';
import { getSavedAddressLabelKind, isPrimaryAddressLabel } from './saved-address-label';
import { SavedAddressCard } from './saved-address-card';

const colors = {
  background: '#F8F4EF',
  empty: '#7A6E78',
} as const;

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export interface SavedAddressesScreenProps {
  /** На вкладке таббара — без кнопки «назад». */
  variant?: 'stack' | 'tab';
}

export function SavedAddressesScreen({ variant = 'stack' }: SavedAddressesScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const tabBarInset = useGlassTabBarInset();

  const { data: addresses = [], isLoading, isError, error, refetch } = useGetSavedAddressesQuery();
  const [deleteAddress, { isLoading: isDeleting }] = useDeleteSavedAddressMutation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const openAddressDetail = (id: string) => {
    router.push({ pathname: '/address/[id]', params: { id } });
  };

  const openAddAddress = () => {
    router.push({ pathname: '/address/search', params: { mode: 'save' } });
  };

  const confirmDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return;
    }

    void deleteAddress(deleteTarget.id)
      .unwrap()
      .then(() => setDeleteTarget(null))
      .catch(() => setDeleteTarget(null));
  };

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />
        <Loader label={t('common.loading')} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />
        <View style={styles.errorWrap}>
          <ErrorView error={toAppError(error)} onRetry={refetch} retryLabel={t('common.retry')} />
        </View>
      </View>
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

      <ScrollView
        contentContainerStyle={{
          gap: scale * 14,
          paddingBottom: tabBarInset + scale * 24,
          paddingHorizontal: scale * 16,
          paddingTop: insets.top + scale * 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassScreenHeader
          rightAction={
            <GlassAddIconButton accessibilityLabel={t('addresses.add')} onPress={openAddAddress} />
          }
          showBack={variant === 'stack'}
          title={t('profile.favoriteAddresses')}
        />

        {addresses.length === 0 ? (
          <Text style={[styles.empty, { fontSize: scale * 14, marginBottom: scale * 6 }]}>
            {t('addresses.empty')}
          </Text>
        ) : (
          addresses.map((address) => (
            <SavedAddressCard
              address={formatShortDisplayAddress(address.address)}
              iconKind={getSavedAddressLabelKind(address.label, t)}
              isPrimary={isPrimaryAddressLabel(address.label, t)}
              key={address.id}
              label={address.label}
              onLongPress={() => confirmDelete(address.id, address.label)}
              onPress={() => openAddressDetail(address.id)}
            />
          ))
        )}

        <AddSavedAddressRow onPress={openAddAddress} title={t('addresses.add')} />
      </ScrollView>

      <GlassConfirmDialog
        confirmTitle={t('common.delete')}
        destructive
        loading={isDeleting}
        message={
          deleteTarget ? t('addresses.deleteConfirm', { label: deleteTarget.label }) : undefined
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.delete')}
        visible={deleteTarget !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ellipse: {
    position: 'absolute',
  },
  empty: {
    color: colors.empty,
    textAlign: 'center',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});

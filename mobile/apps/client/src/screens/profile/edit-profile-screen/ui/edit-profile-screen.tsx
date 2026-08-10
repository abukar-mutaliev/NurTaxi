/**
 * Редактирование профиля (M2.2, M2.6): имя и фото.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar, Text } from '@nurtaxi/shared-core/shared/ui';
import { useGetMeQuery } from '@nurtaxi/shared-core/entities/user';

import { useProfilePhotoUpload, useProfileUpdate } from '@/features/profile';
import {
  GLASS_DESIGN_WIDTH,
  GlassConfirmDialog,
  GlassPrimaryButton,
  GlassScreenShell,
  GlassTextField,
  GLASS_COLORS,
} from '@/shared/ui';

export function EditProfileScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const { data: profile, isLoading } = useGetMeQuery();
  const { updateProfile, isUpdating, error } = useProfileUpdate();
  const {
    openSourcePicker,
    closeSourcePicker,
    sourcePickerVisible,
    permissionDialogVisible,
    deniedSource,
    closePermissionDialog,
    openSettings,
    pickFromSource,
    isUploading,
    error: photoError,
    clearError,
  } = useProfilePhotoUpload();

  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  // Форма заполняется из загруженного профиля. Обновляем прямо при рендере — как только
  // `profile` меняется, значения подставляются в этом же проходе, без лишнего эффекта.
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    setName(profile.name ?? '');
  }

  const canSubmit = name.trim().length >= 2 && !isUpdating;

  const submit = async () => {
    setSaved(false);
    await updateProfile({ name: name.trim() });
    setSaved(true);
  };

  if (isLoading || !profile) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  return (
    <GlassScreenShell
      footer={
        <GlassPrimaryButton
          disabled={!canSubmit}
          loading={isUpdating}
          loadingTitle={t('common.loading')}
          onPress={submit}
          scale={scale}
          title={t('common.save')}
        />
      }
      title={t('profile.editTitle')}
    >
      <View style={{ alignItems: 'center', gap: scale * 8, paddingVertical: scale * 8 }}>
        <Pressable
          accessibilityLabel={t('profile.changePhoto')}
          accessibilityRole="button"
          disabled={isUploading}
          onPress={() => {
            clearError();
            openSourcePicker();
          }}
          style={({ pressed }) => ({ opacity: pressed || isUploading ? 0.85 : 1 })}
        >
          <View style={{ position: 'relative' }}>
            <Avatar name={name || profile.name} size={96} uri={profile.photoUrl} />
            {isUploading ? (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: 'rgba(46,35,49,0.45)',
                  borderRadius: 48,
                  bottom: 0,
                  justifyContent: 'center',
                  left: 0,
                  position: 'absolute',
                  right: 0,
                  top: 0,
                }}
              >
                <ActivityIndicator color="#F7F3EE" />
              </View>
            ) : null}
          </View>
        </Pressable>
        <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 13 }}>
          {t('profile.changePhoto')}
        </Text>
      </View>

      <GlassTextField
        label={t('profile.name')}
        onChangeText={setName}
        placeholder={t('onboarding.namePlaceholder')}
        scale={scale}
        value={name}
      />

      {error ? (
        <Text style={{ color: GLASS_COLORS.error, fontSize: scale * 13, textAlign: 'center' }}>
          {error.message}
        </Text>
      ) : null}

      {photoError ? (
        <Text style={{ color: GLASS_COLORS.error, fontSize: scale * 13, textAlign: 'center' }}>
          {photoError}
        </Text>
      ) : null}

      {saved ? (
        <Text style={{ color: GLASS_COLORS.success, fontSize: scale * 13, textAlign: 'center' }}>
          {t('profile.saveSuccess')}
        </Text>
      ) : null}

      <GlassConfirmDialog
        actions={[
          {
            title: t('documents.fromGallery'),
            onPress: () => pickFromSource('gallery'),
          },
          {
            title: t('documents.fromCamera'),
            onPress: () => pickFromSource('camera'),
            variant: 'secondary',
          },
        ]}
        onCancel={closeSourcePicker}
        title={t('onboarding.photoLabel')}
        visible={sourcePickerVisible}
      />

      <GlassConfirmDialog
        confirmTitle={t('permissions.openSettings')}
        message={
          deniedSource === 'camera'
            ? t('permissions.cameraDescription')
            : t('permissions.galleryDescription')
        }
        onCancel={closePermissionDialog}
        onConfirm={openSettings}
        title={
          deniedSource === 'camera' ? t('permissions.cameraTitle') : t('permissions.galleryTitle')
        }
        visible={permissionDialogVisible}
      />
    </GlassScreenShell>
  );
}

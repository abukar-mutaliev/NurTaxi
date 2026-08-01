/**
 * Редактирование профиля (M2.2, M2.6): имя и язык интерфейса.
 */
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '@nurtaxi/shared-core/shared/i18n';
import { AppLanguage } from '@nurtaxi/shared-core/shared/model';
import { Avatar, Text } from '@nurtaxi/shared-core/shared/ui';
import { useGetMeQuery } from '@nurtaxi/shared-core/entities/user';

import { useProfileUpdate } from '@/features/profile';
import {
  GLASS_DESIGN_WIDTH,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenShell,
  GlassSectionLabel,
  GlassTextField,
  GLASS_COLORS,
} from '@/shared/ui';

export function EditProfileScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const { data: profile, isLoading } = useGetMeQuery();
  const { updateProfile, isUpdating, error } = useProfileUpdate();

  const [name, setName] = useState('');
  const [language, setLanguage] = useState<AppLanguage>(AppLanguage.Ru);
  const [saved, setSaved] = useState(false);

  // Форма заполняется из загруженного профиля. Обновляем прямо при рендере — как только
  // `profile` меняется, значения подставляются в этом же проходе, без лишнего эффекта.
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    setName(profile.name ?? '');
    const lang = profile.language as AppLanguage;
    setLanguage(SUPPORTED_LANGUAGES.includes(lang) ? lang : AppLanguage.Ru);
  }

  const canSubmit = name.trim().length >= 2 && !isUpdating;

  const submit = async () => {
    setSaved(false);
    await updateProfile({ name: name.trim(), language });
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
        <Avatar name={name || profile.name} size={96} uri={profile.photoUrl} />
        <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 13 }}>
          {t('onboarding.photoLabel')}
        </Text>
      </View>

      <GlassTextField
        label={t('profile.name')}
        onChangeText={setName}
        placeholder={t('onboarding.namePlaceholder')}
        scale={scale}
        value={name}
      />

      <View style={{ gap: scale * 10 }}>
        <GlassSectionLabel>{t('profile.language')}</GlassSectionLabel>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const selected = language === lang;
          return (
            <Pressable key={lang} onPress={() => setLanguage(lang)}>
              <GlassCard tone={selected ? 'selected' : 'default'}>
                <Text
                  style={{
                    color: GLASS_COLORS.title,
                    fontSize: scale * 15,
                    fontWeight: selected ? '600' : '500',
                  }}
                >
                  {t(`profile.languages.${lang}`)}
                </Text>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={{ color: GLASS_COLORS.error, fontSize: scale * 13, textAlign: 'center' }}>
          {error.message}
        </Text>
      ) : null}

      {saved ? (
        <Text style={{ color: GLASS_COLORS.success, fontSize: scale * 13, textAlign: 'center' }}>
          {t('profile.saveSuccess')}
        </Text>
      ) : null}
    </GlassScreenShell>
  );
}

/**
 * Экстренные контакты (M2.4): список, добавление, удаление (лимит 5).
 */
import { useState } from 'react';
import { Alert, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, formatPhone, isValidPhone } from '@nurtaxi/shared-core/shared/lib';
import { Button, Input, Sheet, Text } from '@nurtaxi/shared-core/shared/ui';
import {
  EMERGENCY_CONTACTS_LIMIT,
  useCreateEmergencyContactMutation,
  useDeleteEmergencyContactMutation,
  useGetEmergencyContactsQuery,
} from '@nurtaxi/shared-core/entities/emergency-contact';

import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassListRow,
  GlassPrimaryButton,
  GlassScreenShell,
} from '@/shared/ui';

export function EmergencyContactsScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const {
    data: contacts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetEmergencyContactsQuery();
  const [createContact, createState] = useCreateEmergencyContactMutation();
  const [deleteContact] = useDeleteEmergencyContactMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [formError, setFormError] = useState<string | null>(null);

  const atLimit = contacts.length >= EMERGENCY_CONTACTS_LIMIT;
  const canAdd = name.trim().length >= 2 && isValidPhone(phone) && !createState.isLoading;

  const resetForm = () => {
    setName('');
    setPhone('+7 ');
    setFormError(null);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    resetForm();
  };

  const submitContact = async () => {
    setFormError(null);
    try {
      await createContact({ name: name.trim(), phone }).unwrap();
      closeSheet();
    } catch (cause) {
      setFormError(toAppError(cause as never).message);
    }
  };

  const confirmDelete = (id: string, contactName: string) => {
    Alert.alert(t('common.delete'), t('emergency.deleteConfirm', { name: contactName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteContact(id);
        },
      },
    ]);
  };

  if (isLoading) {
    return <GlassScreenShell includeTabBarInset isLoading loadingLabel={t('common.loading')} />;
  }

  if (isError) {
    return (
      <GlassScreenShell
        error={error}
        includeTabBarInset
        isError
        onRetry={refetch}
        retryLabel={t('common.retry')}
      />
    );
  }

  return (
    <>
      <GlassScreenShell includeTabBarInset title={t('emergency.title')}>
        <GlassCaption>{t('emergency.subtitle')}</GlassCaption>

        {contacts.length === 0 ? (
          <View style={{ gap: scale * 16, paddingTop: scale * 8 }}>
            <Text
              style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 14, textAlign: 'center' }}
            >
              {t('emergency.empty')}
            </Text>
            <GlassPrimaryButton
              disabled={atLimit}
              onPress={() => setSheetVisible(true)}
              scale={scale}
              title={t('emergency.add')}
            />
          </View>
        ) : (
          <View style={{ gap: scale * 12 }}>
            {contacts.map((contact) => (
              <GlassListRow
                key={contact.id}
                onPress={() => confirmDelete(contact.id, contact.name)}
                subtitle={formatPhone(contact.phone)}
                title={contact.name}
              />
            ))}

            {atLimit ? (
              <Text style={{ color: GLASS_COLORS.hint, fontSize: scale * 13, textAlign: 'center' }}>
                {t('emergency.limitReached')}
              </Text>
            ) : (
              <GlassPrimaryButton
                onPress={() => setSheetVisible(true)}
                scale={scale}
                title={t('emergency.add')}
              />
            )}
          </View>
        )}
      </GlassScreenShell>

      <Sheet onClose={closeSheet} title={t('emergency.add')} visible={sheetVisible}>
        <View style={{ gap: 16 }}>
          <Input autoFocus label={t('emergency.nameLabel')} onChangeText={setName} value={name} />
          <Input
            keyboardType="phone-pad"
            label={t('emergency.phoneLabel')}
            onChangeText={(value) => setPhone(applyPhoneMask(value))}
            value={phone}
          />
          {formError ? (
            <Text style={{ color: GLASS_COLORS.error, fontSize: 13 }}>{formError}</Text>
          ) : null}
          <Button
            disabled={!canAdd}
            loading={createState.isLoading}
            onPress={submitContact}
            title={t('common.save')}
          />
        </View>
      </Sheet>
    </>
  );
}

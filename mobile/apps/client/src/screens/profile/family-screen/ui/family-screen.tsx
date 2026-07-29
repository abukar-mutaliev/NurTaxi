/**
 * Семейный аккаунт (M10.4, Req §8.6).
 */
import { useState } from 'react';
import { Alert, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { applyPhoneMask, formatPhone, isValidPhone } from '@nurtaxi/shared-core/shared/lib';
import { FamilyMemberStatus } from '@nurtaxi/shared-core/shared/model';
import { Badge, Button, Input, Sheet, Text } from '@nurtaxi/shared-core/shared/ui';
import {
  FAMILY_FEATURE_FLAG,
  useAddFamilyMemberMutation,
  useGetFamilyMembersQuery,
  useRemoveFamilyMemberMutation,
} from '@nurtaxi/shared-core/entities/family';
import { isFeatureEnabled, useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';

import { DEFAULT_REGION_ID } from '@/features/address';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassListRow,
  GlassPrimaryButton,
  GlassScreenShell,
  SwitchRow,
} from '@/shared/ui';

function statusTone(status: string): 'neutral' | 'warning' | 'success' {
  if (status === FamilyMemberStatus.Confirmed) {
    return 'success';
  }
  if (status === FamilyMemberStatus.Pending) {
    return 'warning';
  }
  return 'neutral';
}

function statusLabel(status: string, t: (key: string) => string): string {
  if (status === FamilyMemberStatus.Confirmed) {
    return t('family.statusConfirmed');
  }
  if (status === FamilyMemberStatus.Pending) {
    return t('family.statusPending');
  }
  return t('family.statusRevoked');
}

export function FamilyScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const { data: regions, isLoading: regionsLoading } = useGetRegionsQuery();
  const region = regions?.find((item) => item.id === DEFAULT_REGION_ID) ?? regions?.[0];
  const familyEnabled = isFeatureEnabled(region, FAMILY_FEATURE_FLAG);

  const {
    data: members = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetFamilyMembersQuery(undefined, { skip: !familyEnabled });
  const [addMember, addState] = useAddFamilyMemberMutation();
  const [removeMember] = useRemoveFamilyMemberMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [phone, setPhone] = useState('+7 ');
  const [relation, setRelation] = useState('');
  const [track, setTrack] = useState(true);
  const [notify, setNotify] = useState(true);
  const [pay, setPay] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit =
    relation.trim().length >= 2 && isValidPhone(phone) && !addState.isLoading && Boolean(region);

  const resetForm = () => {
    setPhone('+7 ');
    setRelation('');
    setTrack(true);
    setNotify(true);
    setPay(true);
    setFormError(null);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    resetForm();
  };

  const submitMember = async () => {
    if (!region) {
      return;
    }
    setFormError(null);
    try {
      await addMember({
        regionId: region.id,
        phone,
        relation: relation.trim(),
        track,
        notify,
        pay,
      }).unwrap();
      closeSheet();
    } catch (cause) {
      setFormError(toAppError(cause as never).message);
    }
  };

  const confirmRemove = (id: string, memberPhone: string) => {
    Alert.alert(t('common.delete'), formatPhone(memberPhone), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void removeMember(id);
        },
      },
    ]);
  };

  if (regionsLoading) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (!familyEnabled) {
    return (
      <GlassScreenShell title={t('family.title')}>
        <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 14, textAlign: 'center' }}>
          {t('family.unavailable')}
        </Text>
      </GlassScreenShell>
    );
  }

  if (isLoading) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (isError) {
    return (
      <GlassScreenShell error={error} isError onRetry={refetch} retryLabel={t('common.retry')} />
    );
  }

  return (
    <>
      <GlassScreenShell title={t('family.title')}>
        <GlassCaption>{t('family.hint')}</GlassCaption>

        {members.length === 0 ? (
          <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 14, textAlign: 'center' }}>
            {t('family.empty')}
          </Text>
        ) : (
          <View style={{ gap: scale * 12 }}>
            {members.map((member) => (
              <GlassListRow
                destructive
                key={member.id}
                onPress={() => confirmRemove(member.id, member.memberPhone)}
                right={
                  <Badge label={statusLabel(member.status, t)} tone={statusTone(member.status)} />
                }
                subtitle={member.relation}
                title={formatPhone(member.memberPhone)}
              />
            ))}
          </View>
        )}

        <GlassPrimaryButton
          onPress={() => setSheetVisible(true)}
          scale={scale}
          title={t('family.add')}
        />
      </GlassScreenShell>

      <Sheet onClose={closeSheet} title={t('family.add')} visible={sheetVisible}>
        <View style={{ gap: 16 }}>
          <Input
            keyboardType="phone-pad"
            label={t('auth.phoneLabel')}
            onChangeText={(value) => setPhone(applyPhoneMask(value))}
            value={phone}
          />
          <Input label={t('family.relation')} onChangeText={setRelation} value={relation} />
          <SwitchRow onValueChange={setTrack} title={t('family.permissionTrack')} value={track} />
          <SwitchRow
            onValueChange={setNotify}
            title={t('family.permissionNotify')}
            value={notify}
          />
          <SwitchRow onValueChange={setPay} title={t('family.permissionPay')} value={pay} />
          {formError ? (
            <Text style={{ color: GLASS_COLORS.error, fontSize: 13 }}>{formError}</Text>
          ) : null}
          <Button
            disabled={!canSubmit}
            loading={addState.isLoading}
            onPress={() => {
              void submitMember();
            }}
            title={t('common.add')}
          />
        </View>
      </Sheet>
    </>
  );
}

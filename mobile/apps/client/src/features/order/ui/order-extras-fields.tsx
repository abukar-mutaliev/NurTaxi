/**
 * Пожелания к заказу: детское кресло, поездка для другого, комментарий.
 */
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { applyPhoneMask, formatPhone } from '@nurtaxi/shared-core/shared/lib';
import { FamilyMemberStatus } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import {
  FAMILY_FEATURE_FLAG,
  useGetFamilyMembersQuery,
} from '@nurtaxi/shared-core/entities/family';
import { isFeatureEnabled, useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';

import { GLASS_COLORS, GlassCard, GlassTextField, SwitchRow } from '@/shared/ui';

export interface OrderExtrasFieldsProps {
  regionId: string | null;
  childSeat: boolean;
  orderForOther: boolean;
  passengerName: string;
  passengerPhone: string;
  comment: string;
  familyMemberId: string | null;
  scale?: number;
  variant?: 'glass' | 'sheet';
  onChildSeatChange: (value: boolean) => void;
  onOrderForOtherChange: (value: boolean) => void;
  onPassengerNameChange: (value: string) => void;
  onPassengerPhoneChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onFamilyMemberSelect: (id: string | null, passenger: { name: string; phone: string }) => void;
}

function CompactSwitchRow({
  title,
  value,
  onValueChange,
}: {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={sheetStyles.switchRow}>
      <Text style={sheetStyles.switchTitle}>{title}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: '#D8D0C8', true: GLASS_COLORS.switchActive }}
        value={value}
      />
    </View>
  );
}

export function OrderExtrasFields({
  regionId,
  childSeat,
  orderForOther,
  passengerName,
  passengerPhone,
  comment,
  familyMemberId,
  scale = 1,
  variant = 'glass',
  onChildSeatChange,
  onOrderForOtherChange,
  onPassengerNameChange,
  onPassengerPhoneChange,
  onCommentChange,
  onFamilyMemberSelect,
}: OrderExtrasFieldsProps) {
  const { t } = useTranslation();
  const { data: regions } = useGetRegionsQuery();
  const region = regions?.find((item) => item.id === regionId) ?? regions?.[0];
  const familyEnabled = isFeatureEnabled(region, FAMILY_FEATURE_FLAG);
  const { data: members = [] } = useGetFamilyMembersQuery(undefined, { skip: !familyEnabled });
  const confirmedMembers = members.filter(
    (member) => member.status === FamilyMemberStatus.Confirmed,
  );

  const passengerFields = orderForOther ? (
    <View style={{ gap: variant === 'glass' ? scale * 10 : 8 }}>
      {variant === 'glass' ? (
        <>
          <GlassTextField
            autoCapitalize="words"
            label={t('order.passengerName')}
            onChangeText={onPassengerNameChange}
            placeholder={t('order.passengerNamePlaceholder')}
            scale={scale}
            value={passengerName}
          />
          <GlassTextField
            autoComplete="tel"
            keyboardType="phone-pad"
            label={t('order.passengerPhone')}
            onChangeText={(value) => onPassengerPhoneChange(applyPhoneMask(value))}
            placeholder={t('order.passengerPhonePlaceholder')}
            scale={scale}
            textContentType="telephoneNumber"
            value={passengerPhone}
          />
        </>
      ) : (
        <>
          <GlassTextField
            autoCapitalize="words"
            onChangeText={onPassengerNameChange}
            placeholder={t('order.passengerName')}
            scale={0.86}
            value={passengerName}
          />
          <GlassTextField
            autoComplete="tel"
            keyboardType="phone-pad"
            onChangeText={(value) => onPassengerPhoneChange(applyPhoneMask(value))}
            placeholder={t('order.passengerPhone')}
            scale={0.86}
            textContentType="telephoneNumber"
            value={passengerPhone}
          />
        </>
      )}

      {confirmedMembers.length > 0 ? (
        <View style={{ gap: scale * 8 }}>
          <Text
            style={{
              color: variant === 'glass' ? GLASS_COLORS.subtitle : '#7A6E78',
              fontSize: scale * 13,
              fontWeight: '500',
            }}
          >
            {t('order.familyMembers')}
          </Text>
          {confirmedMembers.map((member) => {
            const selected = familyMemberId === member.id;
            return (
              <Pressable
                key={member.id}
                onPress={() =>
                  onFamilyMemberSelect(selected ? null : member.id, {
                    name: member.relation,
                    phone: applyPhoneMask(member.memberPhone),
                  })
                }
              >
                <GlassCard tone={selected ? 'selected' : 'default'}>
                  <Text
                    style={{
                      color: GLASS_COLORS.title,
                      fontSize: scale * 15,
                      fontWeight: selected ? '600' : '500',
                    }}
                  >
                    {member.relation}
                  </Text>
                  <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 13 }}>
                    {formatPhone(member.memberPhone)}
                  </Text>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  ) : null;

  if (variant === 'sheet') {
    return (
      <View style={sheetStyles.root}>
        <CompactSwitchRow
          onValueChange={onChildSeatChange}
          title={t('order.childSeat')}
          value={childSeat}
        />
        <CompactSwitchRow
          onValueChange={onOrderForOtherChange}
          title={t('order.orderForOther')}
          value={orderForOther}
        />
        {passengerFields}
        <GlassTextField
          multiline
          numberOfLines={2}
          onChangeText={onCommentChange}
          placeholder={t('order.extraComment')}
          scale={0.86}
          value={comment}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: scale * 10 }}>
      <GlassCard>
        <SwitchRow
          onValueChange={onChildSeatChange}
          subtitle={t('order.childSeatHint')}
          title={t('order.childSeat')}
          value={childSeat}
        />
      </GlassCard>

      <GlassCard>
        <SwitchRow
          onValueChange={onOrderForOtherChange}
          subtitle={t('order.orderForOtherHint')}
          title={t('order.orderForOther')}
          value={orderForOther}
        />
        {passengerFields}
      </GlassCard>

      <GlassTextField
        label={t('order.extraComment')}
        multiline
        numberOfLines={3}
        onChangeText={onCommentChange}
        placeholder={t('order.extraCommentPlaceholder')}
        scale={scale}
        value={comment}
      />
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  root: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 32,
  },
  switchTitle: {
    color: '#2E2331',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});

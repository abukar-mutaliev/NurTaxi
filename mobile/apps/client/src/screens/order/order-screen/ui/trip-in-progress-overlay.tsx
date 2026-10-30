import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OrderDriver } from '@nurtaxi/shared-core/shared/model';
import { brandColors, Text } from '@nurtaxi/shared-core/shared/ui';

import { Chevron, CollapsibleSheet } from '@/shared/ui';
import { glassShadow } from '@/shared/ui/glass-shadow';

import { DriverAvatar } from './driver-avatar';
import { useOrderTopInset } from './use-order-top-inset';

const colors = {
  glassBg: brandColors.surface,
  glassBorder: brandColors.divider,
  sheetBg: brandColors.surface,
  shadow: brandColors.shadow,
  text: brandColors.text,
  muted: brandColors.textMuted,
  label: brandColors.textMuted,
  pickupDot: brandColors.secondary,
  stopDot: brandColors.primary,
  dropoffDot: brandColors.text,
  connector: brandColors.divider,
  divider: brandColors.divider,
  shareBg: brandColors.surface,
  contactBg: brandColors.secondarySoft,
  cancelBg: brandColors.dangerSoft,
  cancelText: brandColors.danger,
} as const;

export interface TripInProgressOverlayProps {
  title: string;
  driver?: OrderDriver | null;
  pickupAddress: string;
  /** Промежуточные остановки по порядку, между подачей и точкой Б. */
  stopAddresses?: string[];
  dropoffAddress: string;
  durationLabel: string;
  durationValue: string;
  distanceLabel: string;
  distanceValue: string;
  priceLabel: string;
  priceValue: string;
  shareLabel: string;
  cancelLabel: string;
  canCancel: boolean;
  /** Полная подпись для скринридера: «Связаться с водителем». */
  contactLabel: string;
  /** Видимая подпись компактной кнопки в строке водителя. */
  contactShortLabel: string;
  sosLabel?: string;
  onSos?: () => void;
  onBack: () => void;
  onProfilePress: () => void;
  onShare: () => void;
  onCancel: () => void;
  onContact: () => void;
}

function StatColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statColumn}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function TripInProgressOverlay({
  title,
  driver,
  pickupAddress,
  stopAddresses = [],
  dropoffAddress,
  durationLabel,
  durationValue,
  distanceLabel,
  distanceValue,
  priceLabel,
  priceValue,
  shareLabel,
  cancelLabel,
  canCancel,
  contactLabel,
  contactShortLabel,
  sosLabel,
  onSos,
  onBack,
  onProfilePress,
  onShare,
  onCancel,
  onContact,
}: TripInProgressOverlayProps) {
  const insets = useSafeAreaInsets();
  const headerTopInset = useOrderTopInset();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.topBar, { paddingTop: headerTopInset }]}>
        <View style={styles.headerRow}>
          <View style={styles.sideSlot}>
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                styles.glassButton,
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <Chevron color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.centerSlot}>
            <View style={[styles.glassButton, styles.statusPill]}>
              <Text numberOfLines={1} style={styles.statusText}>
                {title}
              </Text>
            </View>
          </View>

          <View style={[styles.sideSlot, styles.sideSlotRight]}>
            <Pressable
              accessibilityRole="button"
              onPress={onProfilePress}
              style={({ pressed }) => [
                styles.glassButton,
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              {driver ? (
                <DriverAvatar name={driver.fullName} photoUrl={driver.photoUrl} size={44} />
              ) : null}
            </Pressable>
          </View>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        {/* Ручка — верхняя полоса карточки поездки, как в карточке «водитель едет». */}
        <CollapsibleSheet>
          {(handle) => (
            <>
              <View style={styles.tripSheet}>
                {handle}
                {driver ? (
                  <>
                    <View style={styles.driverRow}>
                      <DriverAvatar name={driver.fullName} photoUrl={driver.photoUrl} size={44} />
                      <Text numberOfLines={1} style={styles.driverName}>
                        {driver.fullName}
                      </Text>
                      <Pressable
                        accessibilityLabel={contactLabel}
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={onContact}
                        style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.contactText}>{contactShortLabel}</Text>
                      </Pressable>
                    </View>
                    <View style={styles.driverDivider} />
                  </>
                ) : null}

                <View style={styles.addressBlock}>
                  <View style={styles.addressRail}>
                    <View style={[styles.addressDot, { backgroundColor: colors.pickupDot }]} />
                    {stopAddresses.map((address, index) => (
                      <View key={`${index}:${address}`} style={styles.railStop}>
                        <View style={styles.connector} />
                        <View style={[styles.addressDot, { backgroundColor: colors.stopDot }]} />
                      </View>
                    ))}
                    <View style={styles.connector} />
                    <View style={[styles.addressDot, { backgroundColor: colors.dropoffDot }]} />
                  </View>
                  <View style={styles.addressList}>
                    <Text numberOfLines={2} style={styles.addressText}>
                      {pickupAddress}
                    </Text>
                    {stopAddresses.map((address, index) => (
                      <Text
                        key={`${index}:${address}`}
                        numberOfLines={2}
                        style={[styles.addressText, styles.stopText]}
                      >
                        {address}
                      </Text>
                    ))}
                    <Text numberOfLines={2} style={styles.addressText}>
                      {dropoffAddress}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                  <StatColumn label={durationLabel} value={durationValue} />
                  <StatColumn label={distanceLabel} value={distanceValue} />
                  <StatColumn label={priceLabel} value={priceValue} />
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onShare}
                  style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
                >
                  <Text style={styles.shareText}>{shareLabel}</Text>
                </Pressable>

                {canCancel ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onCancel}
                    style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.cancelText}>{cancelLabel}</Text>
                  </Pressable>
                ) : onSos && sosLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onSos}
                    style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.cancelText}>{sosLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          )}
        </CollapsibleSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  addressBlock: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 23,
    paddingTop: 23,
  },
  addressDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  addressList: {
    flex: 1,
    gap: 24,
  },
  addressRail: {
    alignItems: 'center',
    paddingTop: 6,
    width: 9,
  },
  addressText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  bottom: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.cancelBg,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    height: 56,
    justifyContent: 'center',
    ...glassShadow({ color: colors.shadow }),
  },
  cancelText: {
    color: colors.cancelText,
    fontSize: 13,
    fontWeight: '500',
  },
  contactButton: {
    backgroundColor: colors.contactBg,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  contactText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  connector: {
    backgroundColor: colors.connector,
    flex: 1,
    marginVertical: 4,
    width: 2,
  },
  driverDivider: {
    backgroundColor: colors.divider,
    height: 1,
    marginHorizontal: 19,
    marginTop: 16,
  },
  driverName: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  driverRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 21,
    // Сверху уже ручка карточки — свой отступ меньше.
    paddingTop: 4,
  },
  divider: {
    backgroundColor: colors.divider,
    height: 1,
    marginHorizontal: 19,
    marginTop: 18,
  },
  glassButton: {
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    elevation: 2,
    ...glassShadow({ color: colors.shadow }),
  },
  centerSlot: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  pressed: {
    opacity: 0.88,
  },
  railStop: {
    alignItems: 'center',
    flex: 1,
  },
  stopText: {
    color: colors.muted,
    fontSize: 13,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: colors.shareBg,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    height: 56,
    justifyContent: 'center',
    ...glassShadow({ color: colors.shadow }),
  },
  shareText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statLabel: {
    color: colors.label,
    fontSize: 11,
    textAlign: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingBottom: 22,
    paddingHorizontal: 12,
    paddingTop: 22,
  },
  sideSlot: {
    alignItems: 'flex-start',
    width: 44,
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    width: '100%',
  },
  statusText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 20,
    textAlign: 'center',
  },
  topBar: {
    left: 22,
    position: 'absolute',
    right: 22,
    top: 0,
    zIndex: 2,
  },
  tripSheet: {
    backgroundColor: colors.sheetBg,
    borderColor: colors.glassBorder,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    ...glassShadow({ color: colors.shadow }),
  },
});

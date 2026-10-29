import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRating } from '@nurtaxi/shared-core/shared/lib';
import type { OrderDriver } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';

import { CollapsibleSheet } from '@/shared/ui';
import { glassShadow } from '@/shared/ui/glass-shadow';

import { DriverAvatar } from './driver-avatar';
import { useOrderTopInset } from './use-order-top-inset';

const colors = {
  glassBg: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(255,255,255,0.9)',
  sheetBg: 'rgba(255,255,255,0.82)',
  shadow: 'rgba(89,71,31,0.06)',
  text: '#2E2331',
  muted: '#7A6E78',
  rating: '#C99A54',
  plateBg: '#FCF4E4',
  divider: '#EFE9DC',
  actionBg: 'rgba(252,244,228,0.85)',
  actionIcon: '#C99A54',
  cancelBg: 'rgba(253,239,236,0.85)',
  cancelText: '#E0705F',
  safetyBg: 'rgba(255,255,255,0.82)',
  safetyIconOuter: 'rgba(231,238,227,0.95)',
  safetyIconInner: '#6B9B6E',
  etaBadge: 'rgba(46,35,49,0.88)',
  etaShadow: 'rgba(89,71,31,0.16)',
} as const;

export interface DriverEnRouteOverlayProps {
  driver: OrderDriver;
  statusLabel: string;
  etaLabel?: string | null;
  /** «Связаться с водителем»: звонок или SMS — см. `contactByPhone`. */
  contactLabel: string;
  cancelLabel: string;
  femaleDriverTitle: string;
  femaleDriverSubtitle: string;
  onMenuPress: () => void;
  onProfilePress: () => void;
  onContact: () => void;
  onCancel: () => void;
}

const PHONE_ICON: SymbolViewProps['name'] = { android: 'call', ios: 'phone.fill', web: 'call' };
const CANCEL_ICON: SymbolViewProps['name'] = { android: 'close', ios: 'xmark', web: 'close' };

function ActionButton({
  label,
  icon,
  onPress,
  tone = 'default',
  wide = false,
}: {
  label: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
  tone?: 'default' | 'danger';
  /** Основное действие занимает две доли ряда — длинная подпись не переносится. */
  wide?: boolean;
}) {
  const isDanger = tone === 'danger';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        wide && styles.actionButtonWide,
        {
          backgroundColor: isDanger ? colors.cancelBg : colors.actionBg,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <SymbolView
        name={icon}
        resizeMode="scaleAspectFit"
        size={18}
        tintColor={isDanger ? colors.cancelText : colors.actionIcon}
        type="monochrome"
        weight={{ android: medium, ios: 'medium' }}
      />
      <Text style={[styles.actionLabel, isDanger && styles.actionLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

export function DriverEnRouteOverlay({
  driver,
  statusLabel,
  etaLabel,
  contactLabel,
  cancelLabel,
  femaleDriverTitle,
  femaleDriverSubtitle,
  onMenuPress,
  onProfilePress,
  onContact,
  onCancel,
}: DriverEnRouteOverlayProps) {
  const insets = useSafeAreaInsets();
  const headerTopInset = useOrderTopInset();
  const vehicle = driver.vehicle;
  const vehicleLine = vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.color}` : null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.topBar, { paddingTop: headerTopInset }]}>
        <View style={styles.headerRow}>
          <View style={styles.sideSlot}>
            <Pressable
              accessibilityRole="button"
              onPress={onMenuPress}
              style={({ pressed }) => [
                styles.glassButton,
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.menuIcon}>
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
              </View>
            </Pressable>
          </View>

          <View style={styles.centerSlot}>
            <View style={[styles.glassButton, styles.statusPill]}>
              <Text numberOfLines={1} style={styles.statusText}>
                {statusLabel}
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
              <DriverAvatar name={driver.fullName} photoUrl={driver.photoUrl} size={44} />
            </Pressable>
          </View>
        </View>

        {etaLabel ? (
          <View pointerEvents="none" style={styles.etaWrap}>
            <View style={styles.etaBadge}>
              <Text style={styles.etaText}>{etaLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        pointerEvents="box-none"
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        {/* Ручка — верхняя полоса карточки водителя, а не отдельная плашка над ней. */}
        <CollapsibleSheet>
          {(handle) => (
            <>
              <View style={styles.driverSheet}>
                {handle}
                <View style={styles.driverHeader}>
                  <DriverAvatar name={driver.fullName} photoUrl={driver.photoUrl} />

                  <View style={styles.driverInfo}>
                    <View style={styles.nameRow}>
                      <Text numberOfLines={1} style={styles.driverName}>
                        {driver.fullName}
                      </Text>
                      <Text style={styles.rating}>★ {formatRating(driver.rating)}</Text>
                    </View>
                    {vehicleLine ? (
                      <Text numberOfLines={1} style={styles.vehicleLine}>
                        {vehicleLine}
                      </Text>
                    ) : null}
                    {vehicle?.plateNumber ? (
                      <View style={styles.plateBadge}>
                        <Text style={styles.plateText}>{vehicle.plateNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.actionsRow}>
                  <ActionButton icon={PHONE_ICON} label={contactLabel} onPress={onContact} wide />
                  <ActionButton
                    icon={CANCEL_ICON}
                    label={cancelLabel}
                    onPress={onCancel}
                    tone="danger"
                  />
                </View>
              </View>

              <View style={styles.safetyBanner}>
                <View style={styles.safetyIconOuter}>
                  <View style={styles.safetyIconInner} />
                </View>
                <View style={styles.safetyText}>
                  <Text style={styles.safetyTitle}>{femaleDriverTitle}</Text>
                  <Text style={styles.safetySubtitle}>{femaleDriverSubtitle}</Text>
                </View>
              </View>
            </>
          )}
        </CollapsibleSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    gap: 4,
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionButtonWide: {
    flex: 2,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionLabelDanger: {
    color: colors.cancelText,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 19,
    paddingTop: 14,
  },
  bottom: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  divider: {
    backgroundColor: colors.divider,
    height: 1,
    marginHorizontal: 19,
    marginTop: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 21,
    // Сверху уже ручка карточки — свой отступ меньше.
    paddingTop: 6,
  },
  driverInfo: {
    flex: 1,
    gap: 4,
  },
  driverName: {
    color: colors.text,
    flex: 1,
    fontSize: 19,
    fontWeight: '600',
  },
  driverSheet: {
    backgroundColor: colors.sheetBg,
    borderColor: colors.glassBorder,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    paddingBottom: 19,
    ...glassShadow({ color: colors.shadow }),
  },
  etaBadge: {
    backgroundColor: colors.etaBadge,
    borderRadius: 15,
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...glassShadow({ color: colors.etaShadow, offset: { width: 0, height: 3 }, radius: 10 }),
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  etaWrap: {
    alignItems: 'center',
    marginTop: 12,
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
  menuIcon: {
    gap: 5,
    width: 16,
  },
  menuLine: {
    backgroundColor: colors.text,
    borderRadius: 1,
    height: 2,
    width: 16,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  plateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.plateBg,
    borderRadius: 7,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  plateText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
  rating: {
    color: colors.rating,
    fontSize: 13,
    fontWeight: '600',
  },
  safetyBanner: {
    alignItems: 'center',
    backgroundColor: colors.safetyBg,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingHorizontal: 19,
    paddingVertical: 18,
    ...glassShadow({ color: colors.shadow }),
  },
  safetyIconInner: {
    backgroundColor: colors.safetyIconInner,
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  safetyIconOuter: {
    alignItems: 'center',
    backgroundColor: colors.safetyIconOuter,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  safetySubtitle: {
    color: colors.muted,
    fontSize: 12,
  },
  safetyText: {
    flex: 1,
    gap: 2,
  },
  safetyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
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
  vehicleLine: {
    color: colors.muted,
    fontSize: 13,
  },
});

import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatRating } from '@nurtaxi/shared-core/shared/lib';
import type { OrderDriver } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  glassBg: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(255,255,255,0.9)',
  sheetBg: 'rgba(255,255,255,0.82)',
  shadow: 'rgba(89,71,31,0.06)',
  text: '#2E2331',
  muted: '#7A6E78',
  rating: '#C99A54',
  avatarBg: '#3A1D3F',
  avatarText: '#F7F3EE',
  plateBg: '#FCF4E4',
  divider: '#EFE9DC',
  actionBg: 'rgba(252,244,228,0.85)',
  actionIcon: 'rgba(169,159,166,0.55)',
  cancelBg: 'rgba(253,239,236,0.85)',
  cancelIcon: 'rgba(224,112,95,0.45)',
  cancelText: '#E0705F',
  safetyBg: 'rgba(255,255,255,0.82)',
  safetyIconOuter: 'rgba(231,238,227,0.95)',
  safetyIconInner: '#6B9B6E',
  profileDot: '#E8C882',
  etaBadge: 'rgba(46,35,49,0.88)',
  etaShadow: 'rgba(89,71,31,0.16)',
} as const;

export interface DriverEnRouteOverlayProps {
  driver: OrderDriver;
  statusLabel: string;
  etaLabel?: string | null;
  callLabel: string;
  chatLabel: string;
  cancelLabel: string;
  femaleDriverTitle: string;
  femaleDriverSubtitle: string;
  chatUnavailableMessage: string;
  onMenuPress: () => void;
  onProfilePress: () => void;
  onCall: () => void;
  onCancel: () => void;
}

function ActionButton({
  label,
  onPress,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const isDanger = tone === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: isDanger ? colors.cancelBg : colors.actionBg,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: isDanger ? colors.cancelIcon : colors.actionIcon },
        ]}
      />
      <Text style={[styles.actionLabel, isDanger && styles.actionLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

export function DriverEnRouteOverlay({
  driver,
  statusLabel,
  etaLabel,
  callLabel,
  chatLabel,
  cancelLabel,
  femaleDriverTitle,
  femaleDriverSubtitle,
  chatUnavailableMessage,
  onMenuPress,
  onProfilePress,
  onCall,
  onCancel,
}: DriverEnRouteOverlayProps) {
  const insets = useSafeAreaInsets();
  const initial = driver.fullName.trim().charAt(0).toUpperCase() || '?';
  const vehicle = driver.vehicle;
  const vehicleLine = vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.color}` : null;

  const openChat = () => {
    Alert.alert(chatLabel, chatUnavailableMessage);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
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
              <View style={styles.profileDot} />
            </Pressable>
          </View>
        </View>
      </View>

      {etaLabel ? (
        <View pointerEvents="none" style={styles.etaWrap}>
          <View style={styles.etaBadge}>
            <Text style={styles.etaText}>{etaLabel}</Text>
          </View>
        </View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.driverSheet}>
          <View style={styles.driverHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

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
            <ActionButton label={callLabel} onPress={onCall} />
            <ActionButton label={chatLabel} onPress={openChat} />
            <ActionButton label={cancelLabel} onPress={onCancel} tone="danger" />
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
  actionIcon: {
    borderRadius: 999,
    height: 18,
    width: 18,
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
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.avatarBg,
    borderRadius: 999,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 22,
    fontWeight: '600',
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
    paddingTop: 23,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  etaBadge: {
    backgroundColor: colors.etaBadge,
    borderRadius: 15,
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.etaShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  etaWrap: {
    // Под шапкой «Водитель в пути», по центру — а не абсолютом посреди карты.
    alignItems: 'center',
    marginTop: 10,
  },
  glassButton: {
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
  profileDot: {
    backgroundColor: colors.profileDot,
    borderRadius: 999,
    height: 16,
    width: 16,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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

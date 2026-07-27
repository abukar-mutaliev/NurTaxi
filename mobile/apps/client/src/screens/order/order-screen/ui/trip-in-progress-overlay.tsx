import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  glassBg: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(255,255,255,0.9)',
  sheetBg: 'rgba(255,255,255,0.82)',
  shadow: 'rgba(89,71,31,0.06)',
  text: '#2E2331',
  muted: '#A99FA6',
  label: '#A99FA6',
  pickupDot: '#E8C882',
  dropoffDot: '#2E2331',
  connector: '#EFE9DC',
  divider: '#EFE9DC',
  shareBg: 'rgba(255,255,255,0.82)',
  cancelBg: 'rgba(253,239,236,0.9)',
  cancelText: '#E0705F',
  profileDot: '#E8C882',
} as const;

export interface TripInProgressOverlayProps {
  title: string;
  pickupAddress: string;
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
  sosLabel?: string;
  onSos?: () => void;
  onBack: () => void;
  onProfilePress: () => void;
  onShare: () => void;
  onCancel: () => void;
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
  pickupAddress,
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
  sosLabel,
  onSos,
  onBack,
  onProfilePress,
  onShare,
  onCancel,
}: TripInProgressOverlayProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [
              styles.glassButton,
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={[styles.glassButton, styles.statusPill]}>
            <Text numberOfLines={1} style={styles.statusText}>
              {title}
            </Text>
          </View>

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

      <View
        pointerEvents="box-none"
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <View style={styles.tripSheet}>
          <View style={styles.addressBlock}>
            <View style={styles.addressRail}>
              <View style={[styles.addressDot, { backgroundColor: colors.pickupDot }]} />
              <View style={styles.connector} />
              <View style={[styles.addressDot, { backgroundColor: colors.dropoffDot }]} />
            </View>
            <View style={styles.addressList}>
              <Text numberOfLines={2} style={styles.addressText}>
                {pickupAddress}
              </Text>
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
  backIcon: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
    marginTop: -2,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  cancelText: {
    color: colors.cancelText,
    fontSize: 13,
    fontWeight: '500',
  },
  connector: {
    backgroundColor: colors.connector,
    flex: 1,
    marginVertical: 4,
    width: 2,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
  statusPill: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    height: 44,
    justifyContent: 'center',
    maxWidth: 168,
    paddingHorizontal: 12,
  },
  statusText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
});

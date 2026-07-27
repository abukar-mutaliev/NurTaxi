import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDebouncedValue } from '@nurtaxi/shared-core/shared/lib';
import type { AddressSuggestion, GeoLocation } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '@nurtaxi/shared-core/entities/geo';

import { GLASS_COLORS, GLASS_DESIGN_WIDTH, GlassPrimaryButton } from '@/shared/ui';

import { AddressSuggestionsList } from './address-suggestions-list';
import { geoLocationForSave, suggestionToGeoLocation } from './format-suggestion-address';
import { SavedAddressFormFields } from './saved-address-form-fields';

const DISMISS_DRAG_THRESHOLD = 100;
const DISMISS_VELOCITY = 1.1;
const SHEET_SLIDE_DISTANCE = 640;

export interface SaveAddressSheetProps {
  visible: boolean;
  onClose: () => void;
  label: string;
  onLabelChange: (value: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  onLocationChange?: (location: GeoLocation) => void;
  regionId?: string | null;
  searchLat?: number;
  searchLng?: number;
  onSave: () => void;
  isSaving?: boolean;
  error?: string | null;
}

export function SaveAddressSheet({
  visible,
  onClose,
  label,
  onLabelChange,
  address,
  onAddressChange,
  onLocationChange,
  regionId,
  searchLat,
  searchLng,
  onSave,
  isSaving = false,
  error,
}: SaveAddressSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;

  const translateY = useSharedValue(SHEET_SLIDE_DISTANCE);
  const backdropOpacity = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);

  const debouncedAddress = useDebouncedValue(address.trim(), 400);
  const canSearch = debouncedAddress.length >= MIN_GEO_QUERY_LENGTH;

  const { data: suggestions = [], isFetching } = useSearchAddressesQuery(
    {
      q: debouncedAddress,
      regionId: regionId ?? undefined,
      lat: searchLat,
      lng: searchLng,
      limit: 8,
    },
    { skip: !visible || !canSearch || !regionId },
  );

  const canSave = label.trim().length >= 1 && address.trim().length >= 5 && !isSaving;

  const finishClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClose = useCallback(() => {
    Keyboard.dismiss();
    keyboardOffset.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(height, { duration: 240, easing: Easing.in(Easing.cubic) });
    backdropOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(finishClose)();
      }
    });
  }, [backdropOpacity, finishClose, height, keyboardOffset, translateY]);

  const resetSheetPosition = useCallback(() => {
    translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    backdropOpacity.value = withTiming(1, { duration: 220 });
  }, [backdropOpacity, translateY]);

  const handleSuggestionSelect = useCallback(
    (item: AddressSuggestion) => {
      const location = suggestionToGeoLocation(item, address);
      onAddressChange(location.address ?? '');
      onLocationChange?.(geoLocationForSave(location));
      Keyboard.dismiss();
    },
    [address, onAddressChange, onLocationChange],
  );

  useEffect(() => {
    if (!visible) {
      keyboardOffset.value = 0;
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardOffset.value = withTiming(event.endCoordinates.height, {
        duration: Platform.OS === 'ios' ? (event.duration ?? 250) : 250,
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      keyboardOffset.value = withTiming(0, {
        duration: Platform.OS === 'ios' && 'duration' in event ? (event.duration ?? 250) : 250,
      });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardOffset, visible]);

  useEffect(() => {
    if (!visible) {
      translateY.value = SHEET_SLIDE_DISTANCE;
      backdropOpacity.value = 0;
      return;
    }

    translateY.value = SHEET_SLIDE_DISTANCE;
    backdropOpacity.value = 0;
    backdropOpacity.value = withTiming(1, { duration: 240 });
    translateY.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
  }, [backdropOpacity, translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy > 4 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_event, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.value = gestureState.dy;
            backdropOpacity.value = Math.max(0, 1 - gestureState.dy / (height * 0.45));
          }
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > DISMISS_DRAG_THRESHOLD || gestureState.vy > DISMISS_VELOCITY) {
            animateClose();
            return;
          }

          resetSheetPosition();
        },
        onPanResponderTerminate: () => {
          resetSheetPosition();
        },
      }),
    [animateClose, backdropOpacity, height, resetSheetPosition, translateY],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardOffset.value }],
  }));

  return (
    <Modal animationType="none" onRequestClose={animateClose} transparent visible={visible}>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={styles.root}>
          <Pressable
            accessibilityLabel={t('common.close')}
            onPress={animateClose}
            style={styles.backdropPressable}
          >
            <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
          </Pressable>

          <View pointerEvents="box-none" style={styles.sheetWrap}>
            <Animated.View
              style={[
                styles.panel,
                panelStyle,
                {
                  borderTopLeftRadius: scale * 28,
                  borderTopRightRadius: scale * 28,
                  paddingBottom: insets.bottom + scale * 20,
                  paddingHorizontal: scale * 16,
                },
              ]}
            >
              <View
                {...panResponder.panHandlers}
                style={[
                  styles.dragZone,
                  {
                    marginHorizontal: scale * -16,
                    paddingBottom: scale * 12,
                    paddingHorizontal: scale * 16,
                    paddingTop: scale * 12,
                  },
                ]}
              >
                <View style={styles.handle} />
                <Text style={[styles.title, { fontSize: scale * 18, marginTop: scale * 14 }]}>
                  {t('addresses.saveTitle')}
                </Text>
              </View>

              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={Platform.OS === 'android'}
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
              >
                <SavedAddressFormFields
                  address={address}
                  addressEditable
                  autoFocusLabel
                  error={error}
                  label={label}
                  onAddressChange={onAddressChange}
                  onAddressFocus={() => {
                    requestAnimationFrame(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    });
                  }}
                  onLabelChange={onLabelChange}
                  scale={scale}
                />

                {canSearch ? (
                  <View style={{ marginTop: scale * 12 }}>
                    <AddressSuggestionsList
                      isFetching={isFetching}
                      onSelect={handleSuggestionSelect}
                      scale={scale}
                      suggestions={suggestions}
                    />
                  </View>
                ) : null}
              </ScrollView>

              <View style={{ marginTop: scale * 16 }}>
                <GlassPrimaryButton
                  disabled={!canSave}
                  loading={isSaving}
                  loadingTitle={t('common.loading')}
                  onPress={onSave}
                  scale={scale}
                  title={t('common.save')}
                />
              </View>
            </Animated.View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(46,35,49,0.35)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  dragZone: {
    alignItems: 'center',
    minHeight: 72,
  },
  gestureRoot: {
    flex: 1,
  },
  handle: {
    backgroundColor: 'rgba(169,159,166,0.45)',
    borderRadius: 999,
    height: 4,
    width: 40,
  },
  panel: {
    backgroundColor: GLASS_COLORS.background,
    borderColor: GLASS_COLORS.cardBorder,
    borderTopWidth: 1,
    elevation: 8,
    maxHeight: '92%',
    shadowColor: GLASS_COLORS.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  title: {
    color: GLASS_COLORS.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});

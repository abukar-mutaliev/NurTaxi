/**
 * Оценка звёздами: крупные цели, касание или проведение пальцем по ряду.
 *
 * Раньше звёзды были текстовыми символами без отступов — в них трудно было попасть, а
 * закрашенная и пустая звезда рисовались разными стилями текста, и ряд дёргался при каждом
 * нажатии. Теперь весь ряд — одна зона касания: оценка считается по положению пальца, так что
 * можно и ткнуть в звезду, и провести по ряду до нужной. Каждая смена оценки — лёгкий отклик
 * вибрацией, а подпись под рядом называет выбранную оценку словами.
 */
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

const MAX_RATING = 5;
/** Зона касания одной звезды: не меньше 48 pt по гайдлайнам платформ. */
const STAR_SLOT = 56;
const STAR_SIZE = 40;

export interface StarRatingProps {
  /** 0 — оценка ещё не выбрана. */
  value: number;
  onChange: (value: number) => void;
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const rowWidthRef = useRef(0);
  const lastRef = useRef(value);

  const pick = (event: GestureResponderEvent) => {
    const width = rowWidthRef.current;
    if (!width) {
      return;
    }
    const x = Math.min(Math.max(event.nativeEvent.locationX, 0), width - 1);
    const next = Math.floor((x / width) * MAX_RATING) + 1;
    if (next === lastRef.current) {
      return;
    }
    lastRef.current = next;
    onChange(next);
    void Haptics.selectionAsync();
  };

  const step = (delta: number) => {
    const next = Math.min(MAX_RATING, Math.max(1, (value || 0) + delta));
    if (next !== value) {
      lastRef.current = next;
      onChange(next);
    }
  };

  const label = value ? t(`review.ratingLabels.${value}`) : undefined;

  return (
    <View style={[styles.root, { gap: theme.spacing.xs }]}>
      <View
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        accessibilityLabel={t('review.ratingA11y')}
        accessibilityRole="adjustable"
        accessibilityValue={{ max: MAX_RATING, min: 1, now: value || undefined, text: label }}
        onAccessibilityAction={(event) => {
          step(event.nativeEvent.actionName === 'increment' ? 1 : -1);
        }}
        onLayout={(event) => {
          rowWidthRef.current = event.nativeEvent.layout.width;
        }}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          // Оценку могли сбросить снаружи (закрыли окно) — сравниваем с актуальной.
          lastRef.current = value;
          pick(event);
        }}
        onResponderMove={pick}
        // Палец уже ведёт по звёздам — не отдаём жест родителю посреди движения.
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponder={() => true}
        style={styles.row}
      >
        {Array.from({ length: MAX_RATING }, (_, index) => (
          // Звёзды не принимают касания сами: так `locationX` всегда считается от начала ряда.
          <View key={index} pointerEvents="none" style={styles.slot}>
            <Text
              // Цвет кнопки отправки, а не золото: окно отзыва держится в одной гамме.
              style={[
                styles.star,
                { color: index < value ? theme.colors.primary : theme.colors.border },
              ]}
            >
              ★
            </Text>
          </View>
        ))}
      </View>

      <Text tone={value ? 'default' : 'muted'} variant={value ? 'bodyStrong' : 'caption'}>
        {label ?? t('review.tapToRate')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  slot: {
    alignItems: 'center',
    height: STAR_SLOT,
    justifyContent: 'center',
    width: STAR_SLOT,
  },
  star: {
    fontSize: STAR_SIZE,
    includeFontPadding: false,
    lineHeight: STAR_SIZE + 6,
  },
});

/**
 * Форма отзыва о поездке (M6.6, `§8.14`).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReviewTag } from '@nurtaxi/shared-core/shared/model';
import { Button, Input, Sheet, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useReviewOrderMutation } from '@nurtaxi/shared-core/entities/order';

import { glassShadow } from '@/shared/ui/glass-shadow';

const REVIEW_TAGS = [ReviewTag.Politeness, ReviewTag.CleanCar, ReviewTag.SafeDriving] as const;
const RATINGS = [1, 2, 3, 4, 5] as const;

/** Тот же золотой акцент, что у рейтинга водителя на экране заказа. */
const starColors = {
  filled: '#C99A54',
  empty: '#E0CFAE',
  plate: 'rgba(252,244,228,0.92)',
  plateBorder: 'rgba(255,255,255,0.95)',
  tile: 'rgba(255,255,255,0.72)',
  tileBorder: 'rgba(201,154,84,0.22)',
  halo: 'rgba(232,200,130,0.62)',
  haloBorder: 'rgba(201,154,84,0.5)',
  shadow: 'rgba(89,71,31,0.06)',
} as const;

export interface ReviewSheetProps {
  orderId: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

function RatingStars({
  value,
  label,
  onChange,
  starLabel,
}: {
  value: number;
  label: string;
  onChange: (next: number) => void;
  starLabel: (star: number) => string;
}) {
  return (
    <View style={styles.starsBlock}>
      <View style={styles.starsPlate}>
        {RATINGS.map((star) => {
          const filled = value >= star;

          return (
            <Pressable
              key={star}
              accessibilityLabel={starLabel(star)}
              accessibilityRole="button"
              accessibilityState={{ selected: value === star }}
              hitSlop={4}
              onPress={() => onChange(star)}
              style={({ pressed }) => [
                styles.starButton,
                filled && styles.starButtonFilled,
                pressed && styles.starPressed,
              ]}
            >
              <Text
                style={[styles.starGlyph, filled ? styles.starGlyphFilled : styles.starGlyphEmpty]}
              >
                ★
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

export function ReviewSheet({ orderId, visible, onClose, onSubmitted }: ReviewSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [reviewOrder, reviewState] = useReviewOrderMutation();

  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [isComplaint, setIsComplaint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: ReviewTag) => {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  };

  const reset = () => {
    setRating(5);
    setText('');
    setTags([]);
    setIsComplaint(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);
    try {
      await reviewOrder({
        orderId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        text: text.trim() || undefined,
        tags,
        isComplaint,
      }).unwrap();
      onSubmitted?.();
      close();
    } catch {
      setError(t('errors.generic'));
    }
  };

  return (
    <Sheet onClose={close} title={t('review.title')} visible={visible}>
      <View style={{ gap: theme.spacing.md }}>
        <Text tone="muted" variant="caption">
          {t('review.subtitle')}
        </Text>

        <RatingStars
          label={t(`review.score.${rating}`)}
          onChange={setRating}
          starLabel={(star) => t('review.star', { value: star })}
          value={rating}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {REVIEW_TAGS.map((tag) => (
            <Pressable key={tag} onPress={() => toggleTag(tag)}>
              <View
                style={{
                  backgroundColor: tags.includes(tag)
                    ? theme.colors.successSurface
                    : theme.colors.surfaceMuted,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
              >
                <Text variant="caption">{t(`review.tags.${tag}`)}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Input
          label={t('review.commentPlaceholder')}
          multiline
          numberOfLines={3}
          onChangeText={setText}
          value={text}
        />

        <Pressable onPress={() => setIsComplaint((value) => !value)}>
          <Text tone={isComplaint ? 'danger' : 'muted'} variant="caption">
            {isComplaint ? '✓ ' : ''}
            {t('review.complaint')}
          </Text>
        </Pressable>

        {error ? (
          <Text tone="danger" variant="caption">
            {error}
          </Text>
        ) : null}

        <Button loading={reviewState.isLoading} onPress={submit} title={t('review.submit')} />
        <Button onPress={close} title={t('review.skip')} variant="ghost" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scoreLabel: {
    color: starColors.filled,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  starButton: {
    alignItems: 'center',
    backgroundColor: starColors.tile,
    borderColor: starColors.tileBorder,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  starButtonFilled: {
    backgroundColor: starColors.halo,
    borderColor: starColors.haloBorder,
  },
  starGlyph: {
    fontSize: 32,
    includeFontPadding: false,
    lineHeight: 36,
    textAlign: 'center',
  },
  starGlyphEmpty: {
    color: starColors.empty,
  },
  starGlyphFilled: {
    color: starColors.filled,
  },
  starPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
  starsBlock: {
    gap: 10,
  },
  starsPlate: {
    alignItems: 'center',
    backgroundColor: starColors.plate,
    borderColor: starColors.plateBorder,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 8,
    ...glassShadow({ color: starColors.shadow }),
  },
});

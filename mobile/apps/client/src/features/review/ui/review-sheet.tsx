/**
 * Форма отзыва о поездке (M6.6, `§8.14`).
 *
 * Сначала — только звёзды: оценка не выбрана заранее, а остальное появляется после неё.
 * Теги все про хорошее, поэтому показываем их при 4–5, а жалобу — при 1–3; так окно
 * короткое и не задаёт вопросов, которые к этой оценке не относятся.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReviewTag } from '@nurtaxi/shared-core/shared/model';
import { Button, Input, Sheet, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useReviewOrderMutation } from '@nurtaxi/shared-core/entities/order';

import { StarRating } from './star-rating';

const REVIEW_TAGS = [ReviewTag.Politeness, ReviewTag.CleanCar, ReviewTag.SafeDriving] as const;
/** С какой оценки поездка считается хорошей: показываем теги «что понравилось». */
const GOOD_RATING = 4;

export interface ReviewSheetProps {
  orderId: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReviewSheet({ orderId, visible, onClose, onSubmitted }: ReviewSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [reviewOrder, reviewState] = useReviewOrderMutation();

  // 0 — оценка не выбрана: кнопка отправки неактивна, пока пассажир не поставит звёзды.
  const [rating, setRating] = useState(0);
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
    setRating(0);
    setText('');
    setTags([]);
    setIsComplaint(false);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const isGood = rating >= GOOD_RATING;

  const submit = async () => {
    if (!rating) {
      return;
    }
    setError(null);
    try {
      await reviewOrder({
        orderId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        text: text.trim() || undefined,
        // Скрытые для этой оценки поля не отправляем, даже если их успели отметить.
        tags: isGood ? tags : [],
        isComplaint: !isGood && isComplaint,
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

        <StarRating onChange={setRating} value={rating} />

        {isGood ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label">{t('review.likedTitle')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {REVIEW_TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    hitSlop={4}
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={{
                      backgroundColor: selected
                        ? theme.colors.successSurface
                        : theme.colors.surfaceMuted,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                    }}
                  >
                    <Text tone={selected ? 'success' : 'default'} variant="caption">
                      {selected ? '✓ ' : ''}
                      {t(`review.tags.${tag}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {rating ? (
          <Input
            label={t('review.commentPlaceholder')}
            multiline
            numberOfLines={3}
            onChangeText={setText}
            value={text}
          />
        ) : null}

        {rating && !isGood ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isComplaint }}
            hitSlop={8}
            onPress={() => setIsComplaint((value) => !value)}
          >
            <Text tone={isComplaint ? 'danger' : 'muted'} variant="caption">
              {isComplaint ? '✓ ' : ''}
              {t('review.complaint')}
            </Text>
          </Pressable>
        ) : null}

        {error ? (
          <Text tone="danger" variant="caption">
            {error}
          </Text>
        ) : null}

        <Button
          disabled={!rating}
          loading={reviewState.isLoading}
          onPress={submit}
          title={t('review.submit')}
        />
        <Button onPress={close} title={t('review.skip')} variant="ghost" />
      </View>
    </Sheet>
  );
}

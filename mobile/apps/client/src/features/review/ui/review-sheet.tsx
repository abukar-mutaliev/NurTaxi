/**
 * Форма отзыва о поездке (M6.6, `§8.14`).
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReviewTag } from '@nurtaxi/shared-core/shared/model';
import { Button, Input, Sheet, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useReviewOrderMutation } from '@nurtaxi/shared-core/entities/order';

const REVIEW_TAGS = [ReviewTag.Politeness, ReviewTag.CleanCar, ReviewTag.SafeDriving] as const;
const RATINGS = [1, 2, 3, 4, 5] as const;

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

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, justifyContent: 'center' }}>
          {RATINGS.map((value) => (
            <Pressable key={value} onPress={() => setRating(value)}>
              <Text variant={rating >= value ? 'title' : 'body'}>
                {rating >= value ? '★' : '☆'}
              </Text>
            </Pressable>
          ))}
        </View>

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

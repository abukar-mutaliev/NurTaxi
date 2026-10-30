/**
 * Способы оплаты (M2.5, Figma node 39:1092).
 * Привязка карты через SDK — фаза M6.1; пока демо-список и локальный выбор основной карты.
 */
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brandColors, radius, showAlert, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { GlassAddIconButton, GlassConfirmDialog, GlassScreenHeader } from '@/shared/ui';
import { glassShadow } from '@/shared/ui/glass-shadow';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';
import { PaymentMethodCard, type PaymentCardBrand } from './payment-method-card';

const colors = {
  background: brandColors.background,
  buttonStart: brandColors.primary,
  buttonEnd: brandColors.primary,
  buttonText: brandColors.onPrimary,
  buttonShadow: brandColors.shadow,
  editText: brandColors.primary,
} as const;

interface DemoPaymentCard {
  id: string;
  brand: PaymentCardBrand;
  last4: string;
}

const INITIAL_CARDS: DemoPaymentCard[] = [
  { id: 'visa-4242', brand: 'visa', last4: '4242' },
  { id: 'visa-8282', brand: 'visa', last4: '8282' },
  { id: 'mc-1111', brand: 'mastercard', last4: '1111' },
];

export function PaymentMethodsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const tabBarInset = useGlassTabBarInset();

  const [cards, setCards] = useState(INITIAL_CARDS);
  const [primaryCardId, setPrimaryCardId] = useState(INITIAL_CARDS[0]?.id ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DemoPaymentCard | null>(null);

  const cardItems = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        title: t('payment.cardNumberMasked', {
          brand: card.brand === 'visa' ? t('payment.visa') : t('payment.mastercard'),
          last4: card.last4,
        }),
      })),
    [cards, t],
  );

  const showAddCardHint = () => {
    showAlert(t('payment.addCard'), t('payment.addCardHint'));
  };

  const finishEditing = () => {
    setIsEditing(false);
    setDeleteTarget(null);
  };

  const requestDelete = (card: DemoPaymentCard) => {
    if (cards.length <= 1) {
      showAlert(t('common.delete'), t('payment.cannotDeleteLast'));
      return;
    }

    setDeleteTarget(card);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return;
    }

    const nextCards = cards.filter((card) => card.id !== deleteTarget.id);
    setCards(nextCards);

    if (primaryCardId === deleteTarget.id) {
      setPrimaryCardId(nextCards[0]?.id ?? '');
    }

    setDeleteTarget(null);

    if (nextCards.length <= 1) {
      setIsEditing(false);
    }
  };

  const headerRightAction = isEditing ? (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={finishEditing}
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
    >
      <Text style={[styles.headerActionText, { fontSize: scale * typeScale.base }]}>
        {t('common.done')}
      </Text>
    </Pressable>
  ) : (
    <View style={styles.headerActions}>
      {cards.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setIsEditing(true)}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
        >
          <Text style={[styles.headerActionText, { fontSize: scale * typeScale.base }]}>
            {t('common.edit')}
          </Text>
        </Pressable>
      ) : null}
      <GlassAddIconButton accessibilityLabel={t('payment.addCard')} onPress={showAddCardHint} />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeGradientBackground />

      <ScrollView
        contentContainerStyle={{
          gap: scale * 14,
          paddingBottom: tabBarInset + scale * 24,
          paddingHorizontal: scale * 16,
          paddingTop: insets.top + scale * 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassScreenHeader rightAction={headerRightAction} title={t('payment.methodsTitle')} />

        {cardItems.map((card) => {
          const isPrimary = card.id === primaryCardId;

          return (
            <PaymentMethodCard
              brand={card.brand}
              deleteDisabled={cards.length <= 1}
              editMode={isEditing}
              isPrimary={isPrimary}
              key={card.id}
              onDelete={() => requestDelete(card)}
              onPress={() => setPrimaryCardId(card.id)}
              subtitle={isPrimary && !isEditing ? t('payment.primary') : undefined}
              title={card.title}
            />
          );
        })}

        {!isEditing ? (
          <Pressable
            accessibilityRole="button"
            onPress={showAddCardHint}
            style={({ pressed }) => [{ marginTop: scale * 6, opacity: pressed ? 0.92 : 1 }]}
          >
            <View
              style={[
                styles.addButton,
                {
                  borderRadius: scale * radius.xxl,
                  height: scale * 58,
                },
                { backgroundColor: colors.buttonStart },
              ]}
            >
              <Text style={[styles.addButtonText, { fontSize: scale * typeScale.base }]}>
                {t('payment.addCard')}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </ScrollView>

      <GlassConfirmDialog
        confirmTitle={t('common.delete')}
        destructive
        message={
          deleteTarget
            ? t('payment.deleteConfirm', {
                brand: deleteTarget.brand === 'visa' ? t('payment.visa') : t('payment.mastercard'),
                last4: deleteTarget.last4,
              })
            : undefined
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common.delete')}
        visible={deleteTarget !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    ...glassShadow({ color: colors.buttonShadow, offset: { width: 0, height: 6 }, radius: 9 }),
  },
  addButtonText: {
    color: colors.buttonText,
    fontWeight: '600',
  },
  ellipse: {
    position: 'absolute',
  },
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  headerActionText: {
    color: colors.editText,
    fontWeight: '600',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  pressed: {
    opacity: 0.92,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});

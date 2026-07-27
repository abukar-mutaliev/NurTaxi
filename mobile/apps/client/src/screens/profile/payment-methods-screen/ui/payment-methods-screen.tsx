/**
 * Способы оплаты (M2.5, Figma node 39:1092).
 * Привязка карты через SDK — фаза M6.1; пока демо-список и локальный выбор основной карты.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { GlassAddIconButton, GlassScreenHeader } from '@/shared/ui';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';
import { PaymentMethodCard, type PaymentCardBrand } from './payment-method-card';

const colors = {
  background: '#F8F4EF',
  buttonStart: '#5A2E60',
  buttonEnd: '#3A1D3F',
  buttonText: '#F7F3EE',
  buttonShadow: 'rgba(89,71,31,0.1)',
} as const;

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

interface DemoPaymentCard {
  id: string;
  brand: PaymentCardBrand;
  last4: string;
}

const DEMO_CARDS: DemoPaymentCard[] = [
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

  const [primaryCardId, setPrimaryCardId] = useState(DEMO_CARDS[0]?.id ?? '');

  const cards = useMemo(
    () =>
      DEMO_CARDS.map((card) => ({
        ...card,
        title: t('payment.cardNumberMasked', {
          brand: card.brand === 'visa' ? t('payment.visa') : t('payment.mastercard'),
          last4: card.last4,
        }),
      })),
    [t],
  );

  const showAddCardHint = () => {
    Alert.alert(t('payment.addCard'), t('payment.addCardHint'));
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeGradientBackground />

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.ellipse,
          {
            height: scale * 560,
            left: scale * -90,
            top: scale * -200,
            width: scale * 560,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{
          gap: scale * 14,
          paddingBottom: tabBarInset + scale * 24,
          paddingHorizontal: scale * 16,
          paddingTop: insets.top + scale * 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassScreenHeader
          rightAction={
            <GlassAddIconButton
              accessibilityLabel={t('payment.addCard')}
              onPress={showAddCardHint}
            />
          }
          title={t('payment.methodsTitle')}
        />

        {cards.map((card) => {
          const isPrimary = card.id === primaryCardId;

          return (
            <PaymentMethodCard
              brand={card.brand}
              isPrimary={isPrimary}
              key={card.id}
              onPress={() => setPrimaryCardId(card.id)}
              subtitle={isPrimary ? t('payment.primary') : undefined}
              title={card.title}
            />
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={showAddCardHint}
          style={({ pressed }) => [{ marginTop: scale * 6, opacity: pressed ? 0.92 : 1 }]}
        >
          <LinearGradient
            colors={[colors.buttonStart, colors.buttonEnd]}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={[
              styles.addButton,
              {
                borderRadius: scale * 29,
                height: scale * 58,
              },
            ]}
          >
            <Text style={[styles.addButtonText, { fontSize: scale * 16 }]}>
              {t('payment.addCard')}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    elevation: 3,
    justifyContent: 'center',
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  addButtonText: {
    color: colors.buttonText,
    fontWeight: '600',
  },
  ellipse: {
    position: 'absolute',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});

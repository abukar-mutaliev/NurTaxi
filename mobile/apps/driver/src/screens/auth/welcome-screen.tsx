/**
 * Экран приветствия водителя (M1.1) — первый экран для гостя.
 * Логотип Нур на тёплом кремовом фоне, кнопка «Начать» и ссылка на вход — по макету.
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

const logoAsset = require('@/assets/images/welcome/logo.png');

export function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const goToLogin = () => {
    router.push('/(auth)/phone');
  };

  return (
    <Screen
      footer={
        <View style={{ gap: theme.spacing.md }}>
          <Button onPress={goToLogin} title={t('welcome.start')} />
          <Pressable hitSlop={8} onPress={goToLogin} style={styles.link}>
            <Text align="center" tone="muted" variant="caption">
              {t('welcome.hasAccount')}{' '}
              <Text tone="primary" variant="caption">
                {t('welcome.signIn')}
              </Text>
            </Text>
          </Pressable>
        </View>
      }
    >
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Image contentFit="contain" source={logoAsset} style={styles.logo} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  logo: {
    height: 240,
    width: 240,
  },
  link: {
    alignItems: 'center',
  },
});

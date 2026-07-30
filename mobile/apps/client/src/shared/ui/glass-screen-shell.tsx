import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { ErrorView, Loader, Text } from '@nurtaxi/shared-core/shared/ui';

import { WelcomeGradientBackground } from './welcome-gradient-background';
import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';

import { GlassScreenHeader } from './glass-screen-header';
import { GLASS_COLORS, GLASS_DESIGN_WIDTH } from './glass-theme';

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export interface GlassScreenShellProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: FetchBaseQueryError | SerializedError | null;
  onRetry?: () => void;
  retryLabel?: string;
  loadingLabel?: string;
  includeTabBarInset?: boolean;
  scroll?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function GlassScreenShell({
  title,
  showBack = true,
  onBack,
  rightAction,
  isLoading,
  isError,
  error,
  onRetry,
  retryLabel,
  loadingLabel,
  includeTabBarInset = false,
  scroll = true,
  children,
  footer,
  contentContainerStyle,
}: GlassScreenShellProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const tabBarInset = useGlassTabBarInset();

  const bottomPad = (includeTabBarInset ? tabBarInset : insets.bottom) + scale * 24;
  const contentPadding: ViewStyle = {
    gap: scale * 14,
    paddingBottom: bottomPad,
    paddingHorizontal: scale * 16,
    paddingTop: insets.top + scale * 10,
  };

  const background = (
    <>
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
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        {background}
        <Loader label={loadingLabel} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.root}>
        {background}
        <View style={styles.center}>
          <ErrorView error={toAppError(error)} onRetry={onRetry} retryLabel={retryLabel} />
        </View>
      </View>
    );
  }

  const body = (
    <>
      {title ? (
        <GlassScreenHeader
          onBack={onBack}
          rightAction={rightAction}
          showBack={showBack}
          title={title}
        />
      ) : null}
      {children}
      {footer}
    </>
  );

  if (!scroll) {
    return (
      <View style={styles.root}>
        {background}
        <View style={[styles.flex, contentPadding, contentContainerStyle]}>{body}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {background}
      <ScrollView
        contentContainerStyle={[contentPadding, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </View>
  );
}

export function GlassCaption({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

export function GlassSectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  caption: {
    color: GLASS_COLORS.subtitle,
    fontSize: 13,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ellipse: {
    position: 'absolute',
  },
  flex: {
    flex: 1,
  },
  root: {
    backgroundColor: GLASS_COLORS.background,
    flex: 1,
  },
  sectionLabel: {
    color: GLASS_COLORS.subtitle,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});

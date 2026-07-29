import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS, GLASS_DESIGN_WIDTH } from './glass-theme';
import { GlassPrimaryButton } from './glass-primary-button';

export interface GlassConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmTitle?: string;
  cancelTitle?: string;
  destructive?: boolean;
  loading?: boolean;
  dismissable?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GlassConfirmDialog({
  visible,
  title,
  message,
  confirmTitle,
  cancelTitle,
  destructive = false,
  loading = false,
  dismissable = true,
  onConfirm,
  onCancel,
}: GlassConfirmDialogProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;

  const resolvedConfirmTitle = confirmTitle ?? t('common.confirm');
  const resolvedCancelTitle = cancelTitle ?? t('common.cancel');

  const handleRequestClose = () => {
    if (dismissable && !loading) {
      onCancel();
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={handleRequestClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel={resolvedCancelTitle}
          disabled={!dismissable || loading}
          onPress={handleRequestClose}
          style={styles.backdropPressable}
        >
          <View style={styles.backdrop} />
        </Pressable>

        <View
          pointerEvents="box-none"
          style={[styles.dialogWrap, { paddingHorizontal: scale * 24 }]}
        >
          <View
            style={[
              styles.card,
              {
                borderRadius: scale * 24,
                gap: scale * 16,
                paddingHorizontal: scale * 20,
                paddingVertical: scale * 22,
              },
            ]}
          >
            <Text style={[styles.title, { fontSize: scale * 18 }]}>{title}</Text>
            {message ? (
              <Text style={[styles.message, { fontSize: scale * 15, lineHeight: scale * 22 }]}>
                {message}
              </Text>
            ) : null}

            <View style={{ gap: scale * 10, marginTop: scale * 4 }}>
              <GlassPrimaryButton
                disabled={loading}
                loading={loading}
                loadingTitle={t('common.loading')}
                onPress={onConfirm}
                scale={scale}
                title={resolvedConfirmTitle}
                variant={destructive ? 'destructive' : 'primary'}
              />
              <GlassPrimaryButton
                disabled={loading}
                onPress={onCancel}
                scale={scale}
                title={resolvedCancelTitle}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </View>
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
  card: {
    backgroundColor: GLASS_COLORS.cardBg,
    borderColor: GLASS_COLORS.cardBorder,
    borderWidth: 1,
    elevation: 8,
    shadowColor: GLASS_COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    width: '100%',
  },
  dialogWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: GLASS_COLORS.subtitle,
    textAlign: 'center',
  },
  root: {
    flex: 1,
  },
  title: {
    color: GLASS_COLORS.title,
    fontWeight: '600',
    textAlign: 'center',
  },
});

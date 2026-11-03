import { Image, StyleSheet, View } from 'react-native';

import {
  MAP_CAR_SIZE,
  MAP_MARKER_SOURCES,
  MAP_PIN_SIZE,
  getMarkerAnchorOffset,
  type MapMarker,
} from '@nurtaxi/shared-core/widgets/map';

/**
 * Метка, прибитая к центру карты. Карту двигают под ней — так выбирают,
 * куда подъехать. Якорь совпадает с точкой на растре, чтобы кружок висел над местом.
 */
export function MapCenterPin({ kind = 'pickup' }: { kind?: MapMarker['kind'] }) {
  const anchor = getMarkerAnchorOffset(kind);
  const size = kind === 'driver' ? MAP_CAR_SIZE : MAP_PIN_SIZE;

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Image
        source={MAP_MARKER_SOURCES[kind]}
        style={{
          height: size.height,
          left: '50%',
          marginLeft: -anchor.x,
          marginTop: -anchor.y,
          position: 'absolute',
          top: '50%',
          width: size.width,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

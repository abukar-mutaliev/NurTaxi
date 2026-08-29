import { forwardRef, useImperativeHandle, useState } from 'react';
import { Image, PixelRatio, StyleSheet, View } from 'react-native';

import type { GeoPoint } from '../../../shared/model';
import type { CameraPosition } from '../model/map-provider';
import { projectGeoToScreen } from '../model/project-geo-to-screen';
import { MAP_MARKER_SOURCES } from './map-marker.assets';
import { MAP_DRIVER_HEIGHT, MAP_DRIVER_WIDTH } from './map-marker.constants';

export interface DriverCarOverlayHandle {
  setCamera: (camera: CameraPosition) => void;
}

interface DriverCarOverlayProps {
  initialCamera: CameraPosition;
  mapSize: { height: number; width: number };
  point: GeoPoint;
}

/**
 * Машинка — обычный Image поверх карты, не Placemark MapKit.
 * Placemark (и View, и PNG) у MapKit живёт в координатах карты: при зуме иконка
 * растёт и «прилипает» левым краем к точке.
 */
export const DriverCarOverlay = forwardRef<DriverCarOverlayHandle, DriverCarOverlayProps>(
  function DriverCarOverlay({ initialCamera, mapSize, point }, ref) {
    const [camera, setCamera] = useState(initialCamera);

    useImperativeHandle(ref, () => ({ setCamera }), []);

    const screen = projectGeoToScreen(point, camera, mapSize, PixelRatio.get());
    if (!screen) {
      return null;
    }

    return (
      <View
        pointerEvents="none"
        style={[
          styles.car,
          {
            left: screen.x - MAP_DRIVER_WIDTH / 2,
            top: screen.y - MAP_DRIVER_HEIGHT / 2,
          },
        ]}
      >
        <Image source={MAP_MARKER_SOURCES.driver} style={styles.carImage} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  car: {
    height: MAP_DRIVER_HEIGHT,
    position: 'absolute',
    width: MAP_DRIVER_WIDTH,
  },
  carImage: {
    height: '100%',
    width: '100%',
  },
});

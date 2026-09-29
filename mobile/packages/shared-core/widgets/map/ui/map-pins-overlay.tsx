import { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isValidGeoPoint, normalizeGeoPoint, type CameraPosition } from '../model/map-provider';
import { projectGeoToScreen } from '../model/project-geo-to-screen';
import type { MapMarker } from './map-canvas';
import { MAP_PIN_HEIGHT, MAP_PIN_WIDTH, pinOverlayStyle } from './map-marker.constants';
import { MapPin } from './map-pin';

export interface MapPinsOverlayHandle {
  setCamera: (camera: CameraPosition) => void;
}

interface MapPinsOverlayProps {
  initialCamera: CameraPosition;
  mapSize: { height: number; width: number };
  markers: MapMarker[];
}

/**
 * Пины A/B — обычные View поверх карты, не Placemark MapKit.
 * Placemark (и View, и PNG) у MapKit живёт в координатах карты: иконка растёт
 * вместе с зумом и «прилипает» левым краем к точке, поэтому тап ставил пин
 * заметно правее указанного места.
 */
export const MapPinsOverlay = forwardRef<MapPinsOverlayHandle, MapPinsOverlayProps>(
  function MapPinsOverlay({ initialCamera, mapSize, markers }, ref) {
    const [camera, setCamera] = useState(initialCamera);

    useImperativeHandle(ref, () => ({ setCamera }), []);

    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {markers.map((marker) => {
          if (!isValidGeoPoint(marker.point) || marker.kind === 'driver') {
            return null;
          }

          const point = normalizeGeoPoint(marker.point);
          const screen = projectGeoToScreen(point, camera, mapSize);
          if (!screen) {
            return null;
          }

          return (
            <View key={marker.id} style={[styles.pin, pinOverlayStyle(screen)]}>
              <MapPin kind={marker.kind} />
            </View>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  pin: {
    height: MAP_PIN_HEIGHT,
    position: 'absolute',
    width: MAP_PIN_WIDTH,
    zIndex: 4,
  },
});

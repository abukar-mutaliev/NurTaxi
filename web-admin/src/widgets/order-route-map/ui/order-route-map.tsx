import type { LatLngExpression, LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { decodePolyline } from '@/shared/lib/polyline';
import 'leaflet/dist/leaflet.css';
import styles from './order-route-map.module.css';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
  onClick?: () => void;
}

interface OrderRouteMapProps {
  pickup: { lat: number; lng: number; label?: string };
  dropoff: { lat: number; lng: number; label?: string };
  polyline?: string | null;
  driver?: { lat: number; lng: number; label?: string } | null;
  candidates?: MapMarker[];
  height?: number;
}

function FitBounds({
  points,
}: {
  points: LatLngExpression[];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0] as [number, number], 14);
      return;
    }
    map.fitBounds(points as [number, number][], { padding: [32, 32], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export function OrderRouteMap({
  pickup,
  dropoff,
  polyline,
  driver,
  candidates = [],
  height = 360,
}: OrderRouteMapProps) {
  const routePoints: LatLngTuple[] = polyline
    ? (decodePolyline(polyline) as LatLngTuple[])
    : [
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ];
  const allPoints: LatLngExpression[] = [
    [pickup.lat, pickup.lng],
    [dropoff.lat, dropoff.lng],
    ...routePoints,
    ...(driver ? ([[driver.lat, driver.lng]] as LatLngTuple[]) : []),
    ...candidates.map((c) => [c.lat, c.lng] as LatLngTuple),
  ];
  const center: LatLngExpression = [pickup.lat, pickup.lng];

  return (
    <div className={styles.wrap} style={{ height }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom className={styles.map}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />
        <Polyline positions={routePoints} pathOptions={{ color: '#1B6B5A', weight: 4, opacity: 0.85 }} />
        <CircleMarker
          center={[pickup.lat, pickup.lng]}
          radius={10}
          pathOptions={{ color: '#2E7D48', fillColor: '#2E7D48', fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            {pickup.label ?? 'Откуда'}
          </Tooltip>
        </CircleMarker>
        <CircleMarker
          center={[dropoff.lat, dropoff.lng]}
          radius={10}
          pathOptions={{ color: '#C0392B', fillColor: '#C0392B', fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            {dropoff.label ?? 'Куда'}
          </Tooltip>
        </CircleMarker>
        {driver ? (
          <CircleMarker
            center={[driver.lat, driver.lng]}
            radius={11}
            pathOptions={{ color: '#1565C0', fillColor: '#1976D2', fillOpacity: 1 }}
          >
            <Tooltip direction="top">{driver.label ?? 'Водитель'}</Tooltip>
          </CircleMarker>
        ) : null}
        {candidates.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.lat, marker.lng]}
            radius={9}
            pathOptions={{ color: marker.color, fillColor: marker.color, fillOpacity: 0.9 }}
            eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}
          >
            <Tooltip direction="top">{marker.label}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

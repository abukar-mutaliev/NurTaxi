// Импорт ради побочного эффекта: регистрирует фоновую задачу `expo-task-manager` (M8.2).
// Должен быть подключён как можно раньше — см. `app/_layout.tsx`.
import './model/location-task';

export { DRIVER_LOCATION_TASK, sendDriverLocationUpdate } from './model/location-task';
export { useDriverLocationTracking } from './model/use-driver-location-tracking';

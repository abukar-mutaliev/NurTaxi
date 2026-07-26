import { Redirect } from 'expo-router';

/** Точка входа: дальше водителя перенаправит guard из `src/app/providers/auth-guard`. */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}

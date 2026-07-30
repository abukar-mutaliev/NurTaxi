/**
 * Оставлено для обратной совместимости: фон приветствия теперь рисует общий
 * `ScreenGradientBackground` (готовый PNG-градиент вместо ступеней из полос).
 */
import { ScreenGradientBackground } from './screen-gradient-background';

export function WelcomeGradientBackground() {
  return <ScreenGradientBackground tone="gold" />;
}

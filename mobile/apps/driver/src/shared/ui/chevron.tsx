import { View } from 'react-native';

export interface ChevronProps {
  direction?: 'left' | 'right';
  /** Длина стороны «уголка» в точках. */
  size?: number;
  thickness?: number;
  color: string;
}

/**
 * Шеврон, нарисованный двумя гранями повёрнутого квадрата.
 *
 * Текстовые символы «‹» и «›» рисуются по-разному в системных шрифтах Android, iOS и
 * браузера: разная толщина, разная оптическая база — стрелка выглядит кривой и мелкой.
 * Геометрия одинакова везде.
 */
export function Chevron({ direction = 'left', size = 10, thickness = 2, color }: ChevronProps) {
  const isLeft = direction === 'left';

  return (
    <View
      style={{
        borderColor: color,
        borderLeftWidth: isLeft ? thickness : 0,
        borderRightWidth: isLeft ? 0 : thickness,
        borderTopWidth: thickness,
        height: size,
        // Повёрнутый квадрат смещает оптический центр: компенсируем половиной толщины.
        marginLeft: isLeft ? thickness : -thickness,
        transform: [{ rotate: isLeft ? '-45deg' : '45deg' }],
        width: size,
      }}
    />
  );
}

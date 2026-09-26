import { View } from 'react-native';

export interface ChevronProps {
  direction?: 'left' | 'right';
  /** Длина стороны «уголка» в точках. */
  size?: number;
  thickness?: number;
  color: string;
}

/**
 * Шеврон из двух граней повёрнутого квадрата.
 * Символ «‹» в системном шрифте смещён внутри своей кегельной площадки и в круглой кнопке выглядит не по центру.
 */
export function Chevron({ direction = 'left', size = 12, thickness = 2, color }: ChevronProps) {
  const isLeft = direction === 'left';

  return (
    <View
      style={{
        borderColor: color,
        borderLeftWidth: isLeft ? thickness : 0,
        borderRightWidth: isLeft ? 0 : thickness,
        borderTopWidth: thickness,
        height: size,
        marginLeft: isLeft ? thickness : -thickness,
        transform: [{ rotate: isLeft ? '-45deg' : '45deg' }],
        width: size,
      }}
    />
  );
}

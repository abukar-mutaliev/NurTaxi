import { palette } from '@/shared/config/theme';

interface NurMarkProps {
  size?: number;
  /** `main` — на светлом фоне, `dark` — на тёмном. */
  variant?: 'main' | 'dark';
}

/** Знак «Нур» — та же геометрия, что `brand/logo/nur-mark.svg`: свет над дорогой между крыльями. */
export function NurMark({ size = 24, variant = 'main' }: NurMarkProps) {
  const wing = variant === 'main' ? palette.primary : palette.background;
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 120 120" width={size}>
      <circle cx="60" cy="24" fill={palette.secondary} r="11" />
      <path
        d="M17 41.5C17 69 33 92 53 104L54.5 96C43 86 37 65 37 45C37 41 33 38 29 37.5L21 37.2C18.8 37.1 17 38.9 17 41.5Z"
        fill={wing}
      />
      <path
        d="M103 41.5C103 69 87 92 67 104L65.5 96C77 86 83 65 83 45C83 41 87 38 91 37.5L99 37.2C101.2 37.1 103 38.9 103 41.5Z"
        fill={wing}
      />
      <path d="M56 104L64 104L61.2 56C60.9 53.5 59.1 53.5 58.8 56Z" fill={wing} />
    </svg>
  );
}

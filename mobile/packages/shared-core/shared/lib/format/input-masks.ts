/**
 * Маски ввода для анкеты водителя.
 *
 * Ставят разделители за пользователя: тире в дате и пробел перед кодом региона в номере.
 * Без них человек либо вводит подряд цифры и не проходит проверку, либо расставляет
 * разделители по-своему — и номер уезжает на сервер в непредсказуемом виде.
 *
 * Функции чистые и терпимы к любому вводу, включая вставку из буфера: лишние символы
 * отбрасываются, а не отвергаются целиком.
 */

/**
 * Дата рождения в формате ГГГГ-ММ-ДД.
 *
 * Тире появляются сами после года и после месяца. Удаление работает естественно:
 * маска ставится заново по одним лишь цифрам, поэтому «съев» тире, пользователь стирает
 * предшествующую цифру, а не борется с разделителем.
 */
export function formatBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/**
 * Буквы, разрешённые на российских номерных знаках: только те, что совпадают по
 * начертанию с латиницей. Держим оба алфавита — раскладка на телефоне может быть любой,
 * и «A» с «А» на глаз неразличимы.
 */
const PLATE_LETTERS_RU = 'АВЕКМНОРСТУХ';
const PLATE_LETTERS_EN = 'ABEKMHOPCTYX';

/** Латинская буква → её кириллический близнец: номер всегда храним в кириллице. */
const LATIN_TO_CYRILLIC = new Map(
  [...PLATE_LETTERS_EN].map((letter, index) => [letter, PLATE_LETTERS_RU[index]]),
);

function normalizePlateChar(char: string): string {
  const upper = char.toUpperCase();
  return LATIN_TO_CYRILLIC.get(upper) ?? upper;
}

/**
 * Госномер в формате «А123ВС 06».
 *
 * Раскладка знака: буква, три цифры, две буквы, затем код региона из двух-трёх цифр.
 * Пробел перед кодом ставится сам. Латиница молча заменяется на кириллицу — иначе номер,
 * набранный в английской раскладке, выглядел бы верным, но не проходил проверку.
 */
export function formatPlateInput(raw: string): string {
  const allowed = [...raw]
    .map(normalizePlateChar)
    .filter((char) => /\d/.test(char) || PLATE_LETTERS_RU.includes(char));

  const out: string[] = [];

  for (const char of allowed) {
    const position = out.length;
    const isDigit = /\d/.test(char);

    // Позиции 0, 4, 5 — буквы; 1–3 — цифры серии; с 6-й начинается код региона.
    if (position === 0 || position === 4 || position === 5) {
      if (isDigit) continue;
    } else if (position >= 1 && position <= 3) {
      if (!isDigit) continue;
    } else if (position >= 6) {
      if (!isDigit) continue;
      if (position >= 9) break;
    }

    out.push(char);
  }

  const body = out.slice(0, 6).join('');
  const region = out.slice(6).join('');
  return region ? `${body} ${region}` : body;
}

/** Готов ли номер к отправке: полная раскладка и код региона из двух-трёх цифр. */
export const PLATE_PATTERN = new RegExp(
  `^[${PLATE_LETTERS_RU}]\\d{3}[${PLATE_LETTERS_RU}]{2}\\s\\d{2,3}$`,
);

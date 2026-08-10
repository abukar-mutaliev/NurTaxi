/**
 * Нормализация запросов адресов с учётом особенностей адресации Северного Кавказа (Req §8.9).
 */
const CITY_ALIASES: Record<string, string[]> = {
  назрань: ['nazran', 'назран', 'г назрань', 'город назрань'],
  магас: ['magas', 'г магас'],
  сунжа: ['sunzha', 'п сунжа', 'сунжа'],
  карабулак: ['karabulak', 'г карабулак'],
  малгобек: ['malgobek', 'г малгобек'],
  grozny: ['грозный', 'гrozny'],
  махачкала: ['makhachkala', 'mahachkala'],
};

const STREET_PREFIXES = ['ул', 'улица', 'пр', 'просп', 'проспект', 'пер', 'переулок', 'ш', 'шоссе'];

export function normalizeAddressQuery(raw: string): string {
  let q = raw.trim().toLowerCase();
  q = q.replace(/ё/g, 'е');
  q = q.replace(/[.,;:!?()]/g, ' ');
  q = q.replace(/\s+/g, ' ').trim();

  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    // Каноническая форма уже в запросе — заменять нечего. Без этой проверки алиас,
    // который сам является началом канонической формы («назран» ⊂ «назрань»), портит
    // запрос: replace дописывает хвост и «назрань» превращается в «назраньь»,
    // после чего не находится ни один адрес пилотного города.
    if (q.includes(canonical)) {
      continue;
    }

    for (const alias of aliases) {
      if (q.includes(alias)) {
        q = q.split(alias).join(canonical);
        break;
      }
    }
  }

  for (const prefix of STREET_PREFIXES) {
    const re = new RegExp(`\\b${prefix}\\.?\\s+`, 'g');
    q = q.replace(re, `${prefix} `);
  }

  return q;
}

/** Токены запроса для нечёткого поиска. */
export function tokenizeQuery(normalized: string): string[] {
  return normalized.split(' ').filter((t) => t.length > 1);
}

/** Простая оценка релевантности (больше — лучше). */
export function scoreMatch(normalizedQuery: string, tokens: string[], haystack: string): number {
  let score = 0;
  const hay = haystack.toLowerCase();

  if (hay.includes(normalizedQuery)) {
    score += 100;
  }

  for (const token of tokens) {
    if (hay.includes(token)) {
      score += 10;
    }
  }

  return score;
}

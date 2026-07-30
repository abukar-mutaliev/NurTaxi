/**
 * Справочник для подсказок в анкете водителя.
 *
 * Локальный, а не серверный: список марок меняется редко, а подсказка нужна мгновенно,
 * без сетевой задержки. Отбор марок — под парк такси Северного Кавказа.
 */

export const VEHICLE_MAKES = [
  'Lada',
  'Hyundai',
  'Kia',
  'Toyota',
  'Volkswagen',
  'Renault',
  'Nissan',
  'Skoda',
  'Chevrolet',
  'Ford',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Mazda',
  'Opel',
  'Peugeot',
  'Citroen',
  'Datsun',
  'Geely',
  'Chery',
  'Haval',
  'Changan',
  'UAZ',
  'Mitsubishi',
  'Honda',
  'Subaru',
  'Suzuki',
  'Volvo',
  'Daewoo',
  'Ravon',
] as const;

/** Популярные модели по марке. Если марки нет в справочнике — подсказок не будет. */
export const VEHICLE_MODELS: Record<string, string[]> = {
  Lada: ['Vesta', 'Granta', 'Largus', 'Kalina', 'Priora', 'XRAY', 'Niva', '2107', '2114'],
  Hyundai: ['Solaris', 'Accent', 'Elantra', 'Creta', 'Getz', 'i30', 'Sonata', 'Tucson'],
  Kia: ['Rio', 'Ceed', 'Cerato', 'Sportage', 'Optima', 'Picanto', 'Soul', 'Spectra'],
  Toyota: ['Camry', 'Corolla', 'RAV4', 'Avensis', 'Land Cruiser', 'Prius', 'Yaris'],
  Volkswagen: ['Polo', 'Passat', 'Jetta', 'Golf', 'Tiguan', 'Touareg'],
  Renault: ['Logan', 'Sandero', 'Duster', 'Megane', 'Fluence', 'Kaptur'],
  Nissan: ['Almera', 'Qashqai', 'X-Trail', 'Note', 'Juke', 'Primera', 'Teana'],
  Skoda: ['Octavia', 'Rapid', 'Fabia', 'Superb', 'Yeti', 'Kodiaq'],
  Chevrolet: ['Lacetti', 'Cruze', 'Aveo', 'Niva', 'Captiva', 'Spark'],
  Ford: ['Focus', 'Mondeo', 'Fiesta', 'Kuga', 'Transit'],
  'Mercedes-Benz': ['E-Class', 'C-Class', 'S-Class', 'Vito', 'Sprinter', 'GLE'],
  BMW: ['3 series', '5 series', '7 series', 'X3', 'X5'],
  Audi: ['A4', 'A6', 'A3', 'Q5', 'Q7'],
  Mazda: ['3', '6', 'CX-5', 'Demio', 'CX-7'],
  Opel: ['Astra', 'Corsa', 'Insignia', 'Zafira', 'Vectra'],
  Peugeot: ['308', '408', '206', '3008', 'Partner'],
  Citroen: ['C4', 'C5', 'Berlingo', 'C-Elysee'],
  Datsun: ['on-DO', 'mi-DO'],
  Geely: ['Coolray', 'Atlas', 'Emgrand', 'Tugella'],
  Chery: ['Tiggo 4', 'Tiggo 7 Pro', 'Tiggo 8', 'Arrizo 8'],
  Haval: ['Jolion', 'F7', 'F7x', 'Dargo'],
  Changan: ['CS35 Plus', 'CS55 Plus', 'Eado', 'UNI-K'],
  UAZ: ['Patriot', 'Hunter', 'Profi'],
  Mitsubishi: ['Lancer', 'Outlander', 'ASX', 'Pajero'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Fit'],
  Subaru: ['Forester', 'Impreza', 'Outback', 'Legacy'],
  Suzuki: ['Grand Vitara', 'SX4', 'Swift', 'Jimny'],
  Volvo: ['S60', 'XC60', 'XC90', 'S80'],
  Daewoo: ['Nexia', 'Matiz', 'Gentra', 'Lanos'],
  Ravon: ['Nexia R3', 'R2', 'Gentra'],
};

/** Цвета кузова — привычные названия, как их пишут в СТС. */
export const VEHICLE_COLORS = [
  'белый',
  'чёрный',
  'серебристый',
  'серый',
  'синий',
  'голубой',
  'красный',
  'бордовый',
  'зелёный',
  'коричневый',
  'бежевый',
  'жёлтый',
  'оранжевый',
  'фиолетовый',
] as const;

/** Регистронезависимый отбор по началу слова, затем по вхождению. */
export function filterCatalog(source: readonly string[], query: string, limit = 6): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return source.slice(0, limit);
  }

  const startsWith: string[] = [];
  const contains: string[] = [];

  for (const item of source) {
    const value = item.toLowerCase();
    if (value.startsWith(normalized)) {
      startsWith.push(item);
    } else if (value.includes(normalized)) {
      contains.push(item);
    }
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/** Модели для выбранной марки; марка ищется без учёта регистра. */
export function modelsForMake(make: string): string[] {
  const normalized = make.trim().toLowerCase();
  const key = Object.keys(VEHICLE_MODELS).find((item) => item.toLowerCase() === normalized);
  return (key ? VEHICLE_MODELS[key] : undefined) ?? [];
}

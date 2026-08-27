/**
 * Типы документов водителя (Req §8.2, Des §13.1).
 */
export enum DocumentType {
  Passport = 'passport',
  License = 'license',
  Sts = 'sts',
  Osago = 'osago',
  CarPhoto = 'car_photo',
  InteriorPhoto = 'interior_photo',
  Selfie = 'selfie',
  /** Разрешение на деятельность такси — требуется не во всех регионах, см. `driver-requirement.enum`. */
  TaxiPermit = 'taxi_permit',
}

/** Базовый комплект, обязательный во всех регионах (Req §8.2, этап 3). */
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.Passport,
  DocumentType.License,
  DocumentType.Sts,
  DocumentType.Osago,
  DocumentType.CarPhoto,
  DocumentType.InteriorPhoto,
  DocumentType.Selfie,
];

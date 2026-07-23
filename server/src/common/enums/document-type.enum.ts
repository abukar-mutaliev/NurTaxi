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
}

/** Обязательные документы для отправки на проверку (Req §8.2, этап 3). */
export const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.Passport,
  DocumentType.License,
  DocumentType.Sts,
  DocumentType.Osago,
  DocumentType.CarPhoto,
  DocumentType.InteriorPhoto,
  DocumentType.Selfie,
];

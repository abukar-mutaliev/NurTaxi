import type { DriverDocument } from '../entities/driver-document.entity';

/**
 * Результат автоматической проверки документа (OCR + AI, Req §8.2 — будущее).
 */
export interface DocumentVerificationResult {
  approved: boolean;
  confidence: number;
  notes?: string;
}

/**
 * Хук под будущую автоверификацию документов (Фаза 2.7, P2).
 * Реализация по умолчанию — no-op; ручная модерация остаётся основным путём.
 */
export interface DocumentAutoVerifier {
  verify(document: DriverDocument): Promise<DocumentVerificationResult | null>;
}

export const DOCUMENT_AUTO_VERIFIER = Symbol('DOCUMENT_AUTO_VERIFIER');

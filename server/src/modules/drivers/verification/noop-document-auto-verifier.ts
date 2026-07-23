import { Injectable } from '@nestjs/common';
import type {
  DocumentAutoVerifier,
  DocumentVerificationResult,
} from './document-auto-verifier.interface';
import type { DriverDocument } from '../entities/driver-document.entity';

/**
 * Заглушка автоверификации — всегда возвращает null (ручная модерация).
 * Заменяется OCR+AI-реализацией без изменения вызывающего кода (Des §4.3).
 */
@Injectable()
export class NoOpDocumentAutoVerifier implements DocumentAutoVerifier {
  verify(_document: DriverDocument): Promise<DocumentVerificationResult | null> {
    return Promise.resolve(null);
  }
}

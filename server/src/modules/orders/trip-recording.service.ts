import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { S3StorageService } from '../storage/s3-storage.service';
import { ConfirmTripRecordingDto, PresignTripRecordingDto } from './dto/trip-recording.dto';
import { TripRecording } from './entities/trip-recording.entity';
import { OrdersService } from './orders.service';
import {
  assertAllowedUpload,
  AUDIO_CONTENT_TYPE_EXT,
  AUDIO_CONTENT_TYPES,
  AUDIO_MAX_BYTES,
} from '../storage/upload-constraints';

const RECORDING_ALLOWED_STATUSES: OrderStatus[] = [
  OrderStatus.DriverAssigned,
  OrderStatus.DriverEnRoute,
  OrderStatus.DriverArrived,
  OrderStatus.InProgress,
];

@Injectable()
export class TripRecordingService {
  constructor(
    @InjectRepository(TripRecording)
    private readonly recordings: Repository<TripRecording>,
    private readonly ordersService: OrdersService,
    private readonly storage: S3StorageService,
  ) {}

  async listForOrder(clientId: string, orderId: string): Promise<TripRecording[]> {
    await this.ordersService.getOrderForUser(clientId, orderId, 'client');

    return this.recordings.find({
      where: { orderId, clientId },
      order: { createdAt: 'DESC' },
    });
  }

  async createUploadUrl(clientId: string, orderId: string, dto: PresignTripRecordingDto) {
    const order = await this.ordersService.getOrderForUser(clientId, orderId, 'client');
    this.assertRecordingAllowed(order.status);

    assertAllowedUpload(
      dto.contentType,
      dto.contentLength,
      AUDIO_CONTENT_TYPES,
      AUDIO_MAX_BYTES,
      'аудиофайлы M4A, AAC и MP3',
    );

    const extension =
      this.extensionFromFileName(dto.fileName) ?? AUDIO_CONTENT_TYPE_EXT[dto.contentType] ?? 'm4a';
    const storageKey = this.storage.buildTripRecordingKey(orderId, clientId, extension);

    return this.storage.createUploadUrl({
      storageKey,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  async confirmUpload(
    clientId: string,
    orderId: string,
    dto: ConfirmTripRecordingDto,
  ): Promise<TripRecording> {
    const order = await this.ordersService.getOrderForUser(clientId, orderId, 'client');
    this.assertRecordingAllowed(order.status);

    const expectedPrefix = `orders/${orderId}/recordings/${clientId}/`;
    if (!dto.storageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'INVALID_STORAGE_KEY',
        message: 'Ключ объекта не принадлежит текущей поездке',
      });
    }

    const record = this.recordings.create({
      orderId: order.id,
      clientId,
      storageKey: dto.storageKey,
      durationSec: dto.durationSec ?? null,
    });

    return this.recordings.save(record);
  }

  private assertRecordingAllowed(status: OrderStatus): void {
    if (!RECORDING_ALLOWED_STATUSES.includes(status)) {
      throw new BadRequestException({
        code: 'TRIP_RECORDING_NOT_ALLOWED',
        message: 'Аудиозапись доступна только во время активной поездки с водителем',
      });
    }
  }

  private extensionFromFileName(fileName?: string): string | null {
    if (!fileName) return null;
    const parts = fileName.split('.');
    if (parts.length < 2) return null;
    return parts.at(-1)?.toLowerCase() ?? null;
  }
}

import { createHash } from 'node:crypto';
import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExportDateField,
  ExportFormat,
  ExportStatus,
} from '../../common/enums/compliance.enum';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Order } from '../orders/entities/order.entity';
import { OrderStatusLog } from '../orders/entities/order-status-log.entity';
import { RegulatoryExport } from './entities/regulatory-export.entity';
import { RegulatoryDisclosure } from './entities/regulatory-disclosure.entity';
import { S3StorageService } from '../storage/s3-storage.service';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import type { S3Config } from '../../config/configuration';

export interface CreateExportDto {
  legalBasis: string;
  requestRef: string;
  periodFrom: string;
  periodTo: string;
  dateField?: ExportDateField;
  regionId?: string;
  format?: ExportFormat;
}

const CSV_SEPARATOR = ';';
const CSV_ENCODING = 'utf-8';
const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Регуляторная выгрузка журнала заказов без лимита строк (FZ-05, FZ-10).
 * Кодировка UTF-8 с BOM, разделитель `;`, форматы CSV и JSON.
 */
@Injectable()
export class RegulatoryExportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RegulatoryExportService.name);
  private timer?: NodeJS.Timeout;
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderStatusLog) private readonly statusLogs: Repository<OrderStatusLog>,
    @InjectRepository(RegulatoryExport) private readonly exports: Repository<RegulatoryExport>,
    @InjectRepository(RegulatoryDisclosure)
    private readonly disclosures: Repository<RegulatoryDisclosure>,
    private readonly storage: S3StorageService,
    config: ConfigService,
  ) {
    const s3 = config.getOrThrow<S3Config>('s3');
    this.bucket = s3.bucket;
    this.s3Client = new S3Client({
      region: s3.region,
      credentials: { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey },
      forcePathStyle: s3.forcePathStyle,
      endpoint: s3.endpoint,
    });
  }

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.processQueued().catch((err) =>
        this.logger.warn(`Export tick failed: ${err instanceof Error ? err.message : err}`),
      );
    }, 5_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(actor: AuthenticatedUser, dto: CreateExportDto): Promise<RegulatoryExport> {
    const job = await this.exports.save(
      this.exports.create({
        requestedBy: actor.id,
        legalBasis: dto.legalBasis,
        requestRef: dto.requestRef,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        dateField: dto.dateField ?? ExportDateField.Created,
        regionId: dto.regionId ?? null,
        format: dto.format ?? ExportFormat.Csv,
        status: ExportStatus.Queued,
      }),
    );
    return job;
  }

  async list(regionId?: string): Promise<RegulatoryExport[]> {
    return this.exports.find({
      where: regionId ? { regionId } : {},
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async get(id: string): Promise<RegulatoryExport> {
    const job = await this.exports.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException({ code: 'EXPORT_NOT_FOUND', message: 'Выгрузка не найдена' });
    }
    return job;
  }

  async downloadUrl(id: string): Promise<{ downloadUrl: string; expiresInSec: number; checksum: string | null }> {
    const job = await this.get(id);
    if (job.status !== ExportStatus.Ready || !job.storageKey) {
      throw new NotFoundException({ code: 'EXPORT_NOT_READY', message: 'Файл выгрузки ещё не готов' });
    }
    if (job.expiresAt && job.expiresAt < new Date()) {
      job.status = ExportStatus.Expired;
      await this.exports.save(job);
      throw new NotFoundException({ code: 'EXPORT_EXPIRED', message: 'Срок жизни файла истёк' });
    }
    const signed = await this.storage.createDownloadUrl(job.storageKey, 900);
    return { ...signed, checksum: job.checksum };
  }

  async disclose(actor: AuthenticatedUser, exportId: string): Promise<RegulatoryDisclosure> {
    const job = await this.get(exportId);
    return this.disclosures.save(
      this.disclosures.create({
        exportId: job.id,
        actorId: actor.id,
        legalBasis: job.legalBasis,
        requestRef: job.requestRef,
        periodFrom: job.periodFrom,
        periodTo: job.periodTo,
        rowCount: job.rowCount ?? 0,
        payload: { format: job.format, checksum: job.checksum, storageKey: job.storageKey },
      }),
    );
  }

  async processQueued(limit = 3): Promise<number> {
    const queued = await this.exports.find({
      where: { status: ExportStatus.Queued },
      order: { createdAt: 'ASC' },
      take: limit,
    });
    for (const job of queued) {
      await this.runJob(job);
    }
    return queued.length;
  }

  private async runJob(job: RegulatoryExport): Promise<void> {
    job.status = ExportStatus.Running;
    await this.exports.save(job);
    try {
      const { body, rowCount, checksum } = await this.buildFile(job);
      const storageKey = `exports/${job.id}.${job.format}`;
      await this.storage.ensureBucket();
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: body,
          ContentType: job.format === ExportFormat.Json ? 'application/json' : 'text/csv; charset=utf-8',
        }),
      );
      job.storageKey = storageKey;
      job.rowCount = rowCount;
      job.checksum = checksum;
      job.status = ExportStatus.Ready;
      job.expiresAt = new Date(Date.now() + EXPORT_TTL_MS);
      await this.exports.save(job);
    } catch (error) {
      job.status = ExportStatus.Failed;
      job.errorMessage = error instanceof Error ? error.message : String(error);
      await this.exports.save(job);
      this.logger.warn(`Export ${job.id} failed: ${job.errorMessage}`);
    }
  }

  private async buildFile(
    job: RegulatoryExport,
  ): Promise<{ body: Buffer; rowCount: number; checksum: string }> {
    const dateColumn = job.dateField === ExportDateField.Completed ? 'trip_ended_at' : 'created_at';
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.driver', 'driver')
      .leftJoinAndSelect('o.region', 'region')
      .where(`o.${dateColumn} >= :from`, { from: job.periodFrom })
      .andWhere(`o.${dateColumn} <= :to`, { to: job.periodTo })
      .orderBy(`o.${dateColumn}`, 'ASC')
      .addOrderBy('o.id', 'ASC');
    if (job.regionId) qb.andWhere('o.region_id = :regionId', { regionId: job.regionId });

    const orders = await qb.getMany();
    const ids = orders.map((o) => o.id);
    const logs = ids.length
      ? await this.statusLogs
          .createQueryBuilder('l')
          .where('l.order_id IN (:...ids)', { ids })
          .orderBy('l.created_at', 'ASC')
          .getMany()
      : [];
    const logsByOrder = new Map<string, OrderStatusLog[]>();
    for (const log of logs) {
      const list = logsByOrder.get(log.orderId) ?? [];
      list.push(log);
      logsByOrder.set(log.orderId, list);
    }

    const rows = orders.map((order) => {
      const history = (logsByOrder.get(order.id) ?? [])
        .map((l) => `${l.toStatus}@${l.createdAt.toISOString()}`)
        .join('|');
      const snap = order.assignmentSnapshot;
      const snapObj = snap && typeof snap === 'object' ? snap : null;
      const driver = snapObj && typeof snapObj.driver === 'object' ? snapObj.driver : null;
      const vehicle = snapObj && typeof snapObj.vehicle === 'object' ? snapObj.vehicle : null;
      const carrier = snapObj && typeof snapObj.carrier === 'object' ? snapObj.carrier : null;
      const permit = snapObj && typeof snapObj.permit === 'object' ? snapObj.permit : null;
      return {
        publicNumber: order.publicNumber,
        id: order.id,
        regionId: order.regionId,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        tripStartedAt: order.tripStartedAt?.toISOString() ?? '',
        tripEndedAt: order.tripEndedAt?.toISOString() ?? '',
        priceEstimated: order.priceEstimated,
        priceFinal: order.priceFinal ?? '',
        paymentMethod: order.paymentMethod,
        pickupAddress: order.pickupAddress,
        dropoffAddress: order.dropoffAddress,
        cancellationReason: order.status.startsWith('cancelled') ? order.status : '',
        statusHistory: history,
        driverName: driver?.fullName ?? '',
        driverPhone: driver?.phone ?? '',
        vehiclePlate: vehicle?.plateNumber ?? '',
        vehicleVin: vehicle?.vin ?? '',
        carrierName: carrier?.name ?? '',
        carrierInn: carrier?.inn ?? '',
        permitNumber: permit?.number ?? '',
        completeness: order.completenessStatus,
      };
    });

    let text: string;
    if (job.format === ExportFormat.Json) {
      text = JSON.stringify(
        {
          meta: {
            encoding: CSV_ENCODING,
            periodFrom: job.periodFrom.toISOString(),
            periodTo: job.periodTo.toISOString(),
            dateField: job.dateField,
            requestRef: job.requestRef,
          },
          items: rows,
        },
        null,
        2,
      );
    } else {
      const headers = rows[0] ? Object.keys(rows[0]) : ['publicNumber'];
      const escape = (value: unknown) => {
        const str = value == null ? '' : String(value);
        if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };
      const lines = [
        headers.join(CSV_SEPARATOR),
        ...rows.map((row) => headers.map((h) => escape((row as Record<string, unknown>)[h])).join(CSV_SEPARATOR)),
      ];
      text = `\uFEFF${lines.join('\n')}`;
    }

    const body = Buffer.from(text, 'utf8');
    const checksum = createHash('sha256').update(body).digest('hex');
    return { body, rowCount: rows.length, checksum };
  }
}

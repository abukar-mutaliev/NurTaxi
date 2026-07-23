import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedAddress } from './entities/saved-address.entity';
import { CreateSavedAddressDto } from './dto/saved-address.dto';

@Injectable()
export class SavedAddressesService {
  constructor(
    @InjectRepository(SavedAddress)
    private readonly addresses: Repository<SavedAddress>,
  ) {}

  listByUser(userId: string): Promise<SavedAddress[]> {
    return this.addresses.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateSavedAddressDto): Promise<SavedAddress> {
    const entity = this.addresses.create({
      userId,
      label: dto.label,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
    });
    return this.addresses.save(entity);
  }

  async delete(userId: string, addressId: string): Promise<void> {
    const result = await this.addresses.delete({ id: addressId, userId });
    if (result.affected === 0) {
      throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: 'Адрес не найден' });
    }
  }
}

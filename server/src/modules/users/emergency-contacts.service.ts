import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyContact } from './entities/emergency-contact.entity';
import { CreateEmergencyContactDto } from './dto/emergency-contact.dto';

const MAX_EMERGENCY_CONTACTS = 5;

@Injectable()
export class EmergencyContactsService {
  constructor(
    @InjectRepository(EmergencyContact)
    private readonly contacts: Repository<EmergencyContact>,
  ) {}

  listByUser(userId: string): Promise<EmergencyContact[]> {
    return this.contacts.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async create(userId: string, dto: CreateEmergencyContactDto): Promise<EmergencyContact> {
    const count = await this.contacts.count({ where: { userId } });
    if (count >= MAX_EMERGENCY_CONTACTS) {
      throw new BadRequestException({
        code: 'EMERGENCY_CONTACTS_LIMIT',
        message: `Максимум ${MAX_EMERGENCY_CONTACTS} экстренных контактов`,
      });
    }

    const entity = this.contacts.create({
      userId,
      name: dto.name.trim(),
      phone: dto.phone.trim(),
    });
    return this.contacts.save(entity);
  }

  async delete(userId: string, contactId: string): Promise<void> {
    const result = await this.contacts.delete({ id: contactId, userId });
    if (result.affected === 0) {
      throw new NotFoundException({ code: 'CONTACT_NOT_FOUND', message: 'Контакт не найден' });
    }
  }

  findByUserId(userId: string): Promise<EmergencyContact[]> {
    return this.listByUser(userId);
  }
}

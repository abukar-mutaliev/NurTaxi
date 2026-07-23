import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { CreateEmergencyContactDto } from './dto/emergency-contact.dto';
import { EmergencyContactResponse } from './dto/emergency-contact.presenter';
import { EmergencyContactsService } from './emergency-contacts.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly emergencyContactsService: EmergencyContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Экстренные контакты (Req §8.7)' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<EmergencyContactResponse[]> {
    const items = await this.emergencyContactsService.listByUser(user.id);
    return items.map(EmergencyContactResponse.from);
  }

  @Post()
  @ApiOperation({ summary: 'Добавить экстренный контакт (макс. 5)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmergencyContactDto,
  ): Promise<EmergencyContactResponse> {
    const created = await this.emergencyContactsService.create(user.id, dto);
    return EmergencyContactResponse.from(created);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить экстренный контакт' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.emergencyContactsService.delete(user.id, id);
    return { success: true };
  }
}

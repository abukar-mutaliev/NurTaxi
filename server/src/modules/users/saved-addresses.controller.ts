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
import { CreateSavedAddressDto } from './dto/saved-address.dto';
import { SavedAddressResponse } from './dto/saved-address.presenter';
import { SavedAddressesService } from './saved-addresses.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/addresses')
export class SavedAddressesController {
  constructor(private readonly savedAddressesService: SavedAddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Список любимых адресов (Req §8.5)' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<SavedAddressResponse[]> {
    const items = await this.savedAddressesService.listByUser(user.id);
    return items.map(SavedAddressResponse.from);
  }

  @Post()
  @ApiOperation({ summary: 'Добавить любимый адрес' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSavedAddressDto,
  ): Promise<SavedAddressResponse> {
    const created = await this.savedAddressesService.create(user.id, dto);
    return SavedAddressResponse.from(created);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить любимый адрес' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.savedAddressesService.delete(user.id, id);
    return { success: true };
  }
}

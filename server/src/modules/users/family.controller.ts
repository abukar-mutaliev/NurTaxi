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
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { FamilyService } from './family.service';
import { AddFamilyMemberDto, ConfirmFamilyDto, FamilyMemberResponse } from './dto/family.dto';

@ApiTags('family')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Client)
@Controller('me/family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  @ApiOperation({ summary: 'Семейный аккаунт (Req §8.6)' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<FamilyMemberResponse[]> {
    const members = await this.familyService.list(user.id);
    return members.map(FamilyMemberResponse.from);
  }

  @Post()
  @ApiOperation({ summary: 'Приглашение члена семьи' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddFamilyMemberDto,
  ): Promise<FamilyMemberResponse> {
    const member = await this.familyService.invite(user.id, dto, dto.regionId);
    return FamilyMemberResponse.from(member);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Подтверждение приглашения (член семьи)' })
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmFamilyDto,
  ): Promise<FamilyMemberResponse> {
    const member = await this.familyService.confirm(user.id, id, dto.code);
    return FamilyMemberResponse.from(member);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удаление из семейного аккаунта' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.familyService.revoke(user.id, id);
    return { success: true };
  }
}

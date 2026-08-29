import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RisService } from './ris.service';

class ReplayBody {
  @IsString() from!: string;
  @IsString() to!: string;
  @IsOptional() @IsUUID() regionId?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin, Role.RegionalAdmin)
@Controller('admin/ris')
export class AdminRisController {
  constructor(private readonly ris: RisService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Глубина очереди передачи в РИС (FZ-07.7)' })
  async queue() {
    return { pending: await this.ris.queueDepth() };
  }

  @Post('replay')
  @ApiOperation({ summary: 'Повторная отправка за период (FZ-07.8)' })
  replay(@Body() body: ReplayBody) {
    return this.ris.replayPeriod(new Date(body.from), new Date(body.to), body.regionId);
  }
}

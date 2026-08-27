import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RetentionService } from './retention.service';
import { MIN_ORDER_RETENTION_MONTHS } from '../../common/compliance/compliance-config';

class RetentionBody {
  @IsInt()
  @Min(MIN_ORDER_RETENTION_MONTHS)
  months!: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SuperAdmin)
@Controller('admin/retention')
export class AdminRetentionController {
  constructor(private readonly retention: RetentionService) {}

  @Get()
  @ApiOperation({ summary: 'Срок хранения журнала заказов, месяцы (FZ-03.1)' })
  async get() {
    return { months: await this.retention.getRetentionMonths(), minimum: MIN_ORDER_RETENTION_MONTHS };
  }

  @Patch()
  async set(@Body() body: RetentionBody) {
    const months = await this.retention.setRetentionMonths(body.months);
    return { months, minimum: MIN_ORDER_RETENTION_MONTHS };
  }

  @Post('purge')
  @ApiOperation({ summary: 'Обезличивание записей старше срока хранения' })
  purge() {
    return this.retention.purgeExpired();
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { NotificationSettings, PrivacySettings, User } from '../entities/user.entity';

/** Публичное представление пользователя (без внутренних полей). */
export class UserResponse {
  @ApiProperty() id!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) photoUrl!: string | null;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() language!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ nullable: true, description: 'Регион для operator / regional_admin' })
  assignedRegionId!: string | null;
  @ApiProperty() notificationSettings!: NotificationSettings;
  @ApiProperty() privacySettings!: PrivacySettings;
  @ApiProperty() pdnConsentGiven!: boolean;
  @ApiProperty() createdAt!: Date;

  static from(user: User): UserResponse {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      photoUrl: user.photoUrl,
      role: user.role,
      language: user.language,
      status: user.status,
      assignedRegionId: user.assignedRegionId,
      notificationSettings: user.notificationSettings,
      privacySettings: user.privacySettings,
      pdnConsentGiven: user.pdnConsentAt !== null,
      createdAt: user.createdAt,
    };
  }
}

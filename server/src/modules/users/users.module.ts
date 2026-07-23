import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RegionsModule } from '../regions/regions.module';
import { User } from './entities/user.entity';

import { SavedAddress } from './entities/saved-address.entity';

import { EmergencyContact } from './entities/emergency-contact.entity';

import { FamilyMember } from './entities/family-member.entity';

import { UsersService } from './users.service';

import { SavedAddressesService } from './saved-addresses.service';

import { EmergencyContactsService } from './emergency-contacts.service';

import { FamilyService } from './family.service';

import { UsersController } from './users.controller';

import { SavedAddressesController } from './saved-addresses.controller';

import { EmergencyContactsController } from './emergency-contacts.controller';

import { FamilyController } from './family.controller';

/**

 * Users (Des §2.3): профили клиентов, языки, настройки, любимые и экстренные адреса.

 */

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SavedAddress, EmergencyContact, FamilyMember]),
    forwardRef(() => AuthModule),
    RegionsModule,
  ],
  providers: [UsersService, SavedAddressesService, EmergencyContactsService, FamilyService],

  controllers: [
    UsersController,

    SavedAddressesController,

    EmergencyContactsController,

    FamilyController,
  ],

  exports: [UsersService, EmergencyContactsService, FamilyService],
})
export class UsersModule {}

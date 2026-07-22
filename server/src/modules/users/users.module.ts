import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * Users (Des §2.3): профили клиентов, языки, настройки уведомлений/приватности,
 * согласие на обработку ПДн. Экспортирует UsersService для модуля Auth.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

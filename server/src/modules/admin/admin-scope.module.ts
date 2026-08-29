import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminScopeService } from './admin-scope.service';

@Module({
  imports: [UsersModule],
  providers: [AdminScopeService],
  exports: [AdminScopeService],
})
export class AdminScopeModule {}

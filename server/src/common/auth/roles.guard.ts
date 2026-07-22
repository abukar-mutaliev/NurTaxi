import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedUser } from './jwt-payload.interface';

/**
 * Проверяет, что роль аутентифицированного пользователя входит в список @Roles(...).
 * Должен использоваться после JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Недостаточно прав для выполнения операции',
      });
    }

    return true;
  }
}

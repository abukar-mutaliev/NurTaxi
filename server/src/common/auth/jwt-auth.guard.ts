import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Гард аутентификации по access-токену (стратегия 'jwt').
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

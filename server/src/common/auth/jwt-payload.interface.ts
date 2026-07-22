import { Role } from '../enums/role.enum';

/** Полезная нагрузка access-токена. */
export interface JwtPayload {
  sub: string; // user id
  role: Role;
  phone: string;
}

/** Полезная нагрузка refresh-токена (с идентификатором для ротации). */
export interface RefreshPayload {
  sub: string;
  jti: string;
}

/** Пользователь, помещаемый в request после аутентификации. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  phone: string;
}

import type { INestApplication } from '@nestjs/common';
import type { Role } from '../../src/common/enums/role.enum';
import { TokenService } from '../../src/modules/auth/token/token.service';

export async function issueAccessToken(
  app: INestApplication,
  user: { id: string; role: Role; phone: string },
): Promise<string> {
  const tokens = await app.get(TokenService).issueForUser(user);
  return tokens.accessToken;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

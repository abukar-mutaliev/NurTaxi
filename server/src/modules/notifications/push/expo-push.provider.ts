import { Injectable, Logger } from '@nestjs/common';
import { PushTokensService } from '../push-tokens.service';
import { buildExpoPushMessage, isExpoPushToken } from './expo-push-message';
import type { PushMessage, PushProvider } from './push-provider.interface';

const DEFAULT_EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Доставка на Android через Expo Push → FCM.
 *
 * Приложения регистрируют Expo-токен (`getExpoPushTokenAsync`). Без title/body и
 * `channelId: orders` Android 8+ такое сообщение не показывает.
 */
@Injectable()
export class ExpoPushProvider implements PushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);

  constructor(private readonly pushTokens: PushTokensService) {}

  async send(userId: string, message: PushMessage): Promise<void> {
    const tokens = (await this.pushTokens.listForUser(userId)).filter((record) =>
      isExpoPushToken(record.token),
    );
    if (tokens.length === 0) {
      this.logger.debug(`push user=${userId} — нет Expo-токена`);
      return;
    }

    const url = process.env.EXPO_PUSH_URL?.trim() || DEFAULT_EXPO_PUSH_URL;
    const accessToken = process.env.PUSH_TOKEN?.trim();
    const messages = tokens.map((record) => buildExpoPushMessage(record.token, message));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      this.logger.warn(
        `Expo push не отправился: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    if (!response.ok) {
      this.logger.warn(`Expo push HTTP ${response.status}`);
      return;
    }

    const payload = (await response.json()) as { data?: ExpoPushTicket[] };
    const tickets = payload.data ?? [];
    for (let index = 0; index < tokens.length; index += 1) {
      const ticket = tickets[index];
      const token = tokens[index]?.token;
      if (!token || ticket?.status !== 'error') {
        continue;
      }
      this.logger.warn(
        `Expo push error ${ticket.details?.error ?? 'unknown'}: ${ticket.message ?? ''}`,
      );
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await this.pushTokens.removeByToken(token);
      }
    }
  }
}

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket, Namespace } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { Role } from '../../common/enums/role.enum';
import { clientRoom, driverRoom, orderRoom } from './realtime.constants';
import { RealtimeBroadcastService } from './realtime-broadcast.service';
import { WsSubscriptionService } from './ws-subscription.service';
import { WsAuthService } from './ws-auth.service';
import { OrderTrackingService } from '../orders/order-tracking.service';
import { RealtimeLocationBridge } from './realtime-location.bridge';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly wsAuth: WsAuthService,
    private readonly subscriptions: WsSubscriptionService,
    private readonly broadcast: RealtimeBroadcastService,
    @Inject(forwardRef(() => OrderTrackingService))
    private readonly orderTracking: OrderTrackingService,
    private readonly locationBridge: RealtimeLocationBridge,
  ) {}

  afterInit(server: Server): void {
    const pub = this.redis.duplicate();
    const sub = this.redis.duplicate();
    // При namespace: '/ws' Nest передаёт Namespace, а adapter задаётся на корневом Server.
    const io = server instanceof Namespace ? server.server : server;
    io.adapter(createAdapter(pub, sub));

    this.broadcast.setHandler((envelope) => {
      server.to(envelope.room).emit(envelope.event, envelope.data);
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization as string | undefined);

      const user = await this.wsAuth.authenticate(token);
      client.data.user = user;

      const room = user.role === Role.Driver ? driverRoom(user.id) : clientRoom(user.id);
      await client.join(room);
      await this.subscriptions.add(client.id, room);

      this.logger.debug(`WS подключение: user=${user.id} room=${room}`);
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    await this.subscriptions.removeSocket(client.id);
  }

  @SubscribeMessage('subscribe:order')
  async subscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId: string },
  ): Promise<{ success: boolean; room: string }> {
    const user = client.data.user;
    await this.orderTracking.assertSubscribe(user, body.orderId);

    const room = orderRoom(body.orderId);
    await client.join(room);
    await this.subscriptions.add(client.id, room);

    return { success: true, room };
  }

  @SubscribeMessage('driver.location')
  async onDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { lat: number; lng: number },
  ): Promise<{ success: boolean }> {
    const user = client.data.user;
    if (user.role !== Role.Driver) {
      return { success: false };
    }

    await this.locationBridge.updateAndBroadcast(user.id, body.lat, body.lng);
    return { success: true };
  }
}

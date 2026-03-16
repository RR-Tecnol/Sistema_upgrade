import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationsGateway
    implements OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    server: Server;

    private connectedUsers = new Map<string, string>(); // userId -> socketId
    private readonly logger = new Logger(NotificationsGateway.name);

    constructor(private jwtService: JwtService) {}

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
                (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
            if (!token) { client.disconnect(); return; }
            const payload = this.jwtService.verify(token);
            // SEC-07: usar payload.sub explicitamente — JWT sempre gera com sub
            // Falhar rápido se sub ausente em vez de propagar undefined
            const userId = payload.sub as string | undefined;
            if (!userId) {
                this.logger.warn('WS rejeitado: token sem campo sub');
                client.disconnect();
                return;
            }
            client.data.userId = userId;
            this.connectedUsers.set(userId, client.id);
            client.join(`user:${userId}`);
            if (payload.role === 'ADMIN' || payload.role === 'COORDINATOR') {
                client.join('admins');
            }
            // BUG-13: userId mascarado nos logs — LGPD
            this.logger.debug(`WS conectado: ...${userId.slice(-8)}`);
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        if (client.data?.userId) {
            this.connectedUsers.delete(client.data.userId);
        }
        this.logger.debug(`WS desconectado: ${client.id}`);
    }

    // Métodos de emissão — usados por outros serviços
    notifyAdmins(event: string, data: any) {
        this.server.to('admins').emit(event, data);
    }

    notifyUser(userId: string, event: string, data: any) {
        this.server.to(`user:${userId}`).emit(event, data);
    }

    notifyAll(event: string, data: any) {
        this.server.emit(event, data);
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        client.emit('pong', { ts: Date.now() });
    }
}

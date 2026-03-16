import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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

    constructor(private jwtService: JwtService) {}

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
                (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
            if (!token) { client.disconnect(); return; }
            const payload = this.jwtService.verify(token);
            client.data.userId = payload.sub || payload.id;
            this.connectedUsers.set(client.data.userId, client.id);
            // Entrar em sala pessoal e sala de admins
            client.join(`user:${client.data.userId}`);
            if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') {
                client.join('admins');
            }
            console.log(`WS connected: ${client.data.userId}`);
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        if (client.data?.userId) {
            this.connectedUsers.delete(client.data.userId);
        }
        console.log(`WS disconnected: ${client.id}`);
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

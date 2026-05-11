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
import { getFrontendCorsOrigins } from '../common/cors-origins';
import { withNormalizedActorWsPayload } from './ws-notification-payload.contract';

@WebSocketGateway({
    cors: {
        origin: getFrontendCorsOrigins(),
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
            // Sala «admins»: operações administrativas + financeiro (UX-5 — refresh listagens)
            if (
                payload.role === 'ADMIN' ||
                payload.role === 'COORDINATOR' ||
                payload.role === 'FINANCIAL' ||
                payload.role === 'IT_ADMIN'
            ) {
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
        this.server.to('admins').emit(event, withNormalizedActorWsPayload(data));
    }

    /**
     * UX-5: outras abas admin (Contas a pagar, Reembolsos, …) recarregam listagens.
     * Payload mínimo + `source` para debug; nunca bloquear o chamador.
     */
    notifyFinanceiroListagemRefresh(extra: Record<string, unknown> = {}) {
        this.notifyAdmins('financeiro_listagem_refresh', {
            ts: new Date().toISOString(),
            ...extra,
        });
    }

    notifyUser(userId: string, event: string, data: any) {
        this.server.to(`user:${userId}`).emit(event, withNormalizedActorWsPayload(data));
    }

    notifyAll(event: string, data: any) {
        this.server.emit(event, withNormalizedActorWsPayload(data));
    }

    // Eventos registrados: nova_inscricao, inscricao_aprovada, inscricao_rejeitada,
    // frequencia_registrada, imprevisto_cadastrado, imprevisto_cadastrado_por_admin,
    // imprevisto_revisado, reembolso_solicitado, reembolso_revisado, custo_excessivo,
    // financeiro_listagem_refresh (UX-5 — admins),
    // F2.9: driver_location_update, driver_trip_started, driver_arrived, driver_alert
    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        client.emit('pong', { ts: Date.now() });
    }
}

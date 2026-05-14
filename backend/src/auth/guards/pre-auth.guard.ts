import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * PreAuthGuard — protege endpoints intermediários do fluxo MFA.
 *
 * Valida um Pre-Auth Token: JWT de vida curta (10min) com claim
 * `scope: 'pre_auth'` emitido após cada etapa bem-sucedida do login.
 * NÃO é um access token — JwtAuthGuard o rejeita.
 *
 * Injeta req.preAuth = { sub: userId, scope, step } para uso nos handlers.
 */
@Injectable()
export class PreAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        // Aceita tanto do body quanto de header (flexibilidade)
        const token = req.body?.preAuthToken || req.headers['x-pre-auth-token'];

        if (!token) {
            throw new UnauthorizedException('Pre-auth token obrigatório para continuar');
        }

        try {
            const payload = this.jwtService.verify(token, {
                secret: this.config.get('JWT_SECRET'),
            });

            if (payload.scope !== 'pre_auth') {
                throw new Error('scope inválido');
            }

            req.preAuth = payload; // { sub: userId, scope: 'pre_auth', step }
            return true;
        } catch {
            throw new UnauthorizedException('Pre-auth token inválido ou expirado — faça login novamente');
        }
    }
}

import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Rotas públicas passam sempre
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const { user } = context.switchToHttp().getRequest();
        if (!user) return false;

        // IT_ADMIN tem acesso irrestrito a qualquer endpoint protegido
        if (user.role === 'IT_ADMIN') return true;

        // VULN-13: deny-by-default quando RolesGuard aplicado sem @Roles()
        // Endpoint com RolesGuard mas sem @Roles() é um erro do desenvolvedor — negar.
        if (!requiredRoles || requiredRoles.length === 0) {
            const req = context.switchToHttp().getRequest();
            this.logger.warn(
                `RolesGuard: ${req.method} ${req.url} tem RolesGuard sem @Roles() — negado por padrão (VULN-13)`
            );
            return false;
        }

        return requiredRoles.some((role) => user.role === role);

    }
}

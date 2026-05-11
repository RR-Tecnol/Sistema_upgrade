import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SettingsService } from './settings/settings.service';
import { getFrontendCorsOrigins } from './common/cors-origins';

async function bootstrap() {
    /** bodyParser: false + json(15mb) — inscrição pública envia documentos (URLs/JSON) e pode exceder o default ~100kb */
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: false,
    });
    app.use(json({ limit: '15mb' }));

    // ── VULN-03: Validação do JWT_SECRET na inicialização ─────────────────────
    // Se o secret for fraco/ausente, o servidor não sobe em produção.
    // Em dev, emite aviso mas permite iniciar para facilitar desenvolvimento.
    const jwtSecret = process.env.JWT_SECRET ?? '';
    if (jwtSecret.length < 64) {
        const msg = [
            '⚠️  SEGURANÇA: JWT_SECRET inválido!',
            `   Atual: ${jwtSecret.length} caracteres. Mínimo exigido: 64.`,
            '   Gere um novo: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
        ].join('\n');
        if (process.env.NODE_ENV === 'production') {
            console.error(msg);
            process.exit(1); // Bloqueia subida em produção com secret fraco
        } else {
            console.warn(msg);
        }
    }

    // Segurança HTTP — headers de proteção (SEC-04)
    // CSP habilitado com whitelist explícita:
    //   - connect-src: permite chamadas ao próprio backend + Nominatim (via backend, não frontend)
    //   - img-src: permite tiles OSM (map.jpg, etc.) quando o mapa Leaflet for ativado
    //   - script-src / style-src: apenas 'self' + inline para Next.js
    app.use(helmet({
        crossOriginEmbedderPolicy: false, // Necessário para Swagger funcionar
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js precisa de eval em dev
                styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
                fontSrc: ["'self'", 'fonts.gstatic.com'],
                imgSrc: [
                    "'self'",
                    'data:',
                    'blob:',
                    '*.openstreetmap.org',   // tiles do mapa Leaflet
                    '*.tile.openstreetmap.org',
                ],
                connectSrc: [
                    "'self'",
                    // Nominatim NÃO listado aqui — chamado apenas pelo backend, nunca pelo browser
                ],
                frameSrc: [
                    "'none'",
                    'https://www.openstreetmap.org', // iframe de preview do local (LocationFields)
                ],
                objectSrc: ["'none'"],
            },
        },
    }));

    // Global prefix
    app.setGlobalPrefix('api');

    // CORS — FRONTEND_URLS ou FRONTEND_URL (lista com vírgulas); dev sem env aceita várias portas e 127.0.0.1
    app.enableCors({
        origin: getFrontendCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Admin-Bypass'],
        exposedHeaders: ['Content-Disposition'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Swagger — disponível APENAS em desenvolvimento
    // VULN-11: nunca expor em produção (mapeia todos os endpoints para atacantes)
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('Projeto Cursos Upgrade API')
            .setDescription('API para gestão dos programas Qualifica Maranhão e Qualifica Piauí')
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('auth', 'Autenticação e autorização')
            .addTag('users', 'Gestão de usuários')
            .addTag('students', 'Gestão de alunos')
            .addTag('teachers', 'Gestão de professores')
            .addTag('courses', 'Gestão de cursos')
            .addTag('classes', 'Gestão de turmas')
            .addTag('enrollments', 'Gestão de inscrições')
            .addTag('attendance', 'Gestão de frequência')
            .addTag('certificates', 'Gestão de certificados')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
        console.log(`📚 Swagger disponível em http://localhost:${process.env.PORT || 3001}/api/docs`);
    }

    const port = process.env.PORT || 3001;

    // Middleware de modo manutencao (S5-04)
    const settingsService = app.get(SettingsService);
    app.use((req: any, res: any, next: any) => {
        if (settingsService.isMaintenanceMode()) {
            // Permitir: login + rotas admin + health
            const allowed = ['/api/auth/login', '/api/settings', '/api/health', '/api/ready'];
            const maintenanceKey = process.env.MAINTENANCE_KEY;
            const bypassValid =
                !!maintenanceKey &&
                maintenanceKey.length > 0 &&
                req.headers['x-admin-bypass'] === maintenanceKey;
            const isAllowed =
                allowed.some((p: string) => req.path.startsWith(p)) || bypassValid;
            if (!isAllowed) {
                return res.status(503).json({
                    statusCode: 503,
                    message: 'Sistema em manutenção. Tente novamente em breve.',
                    maintenance: true,
                });
            }
        }
        next();
    });

    await app.listen(port);

    console.log(`\n🚀 Server running on http://localhost:${port}`);
    console.log(`📚 API Docs available at http://localhost:${port}/api/docs\n`);
}

bootstrap();

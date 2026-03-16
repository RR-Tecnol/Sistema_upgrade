import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SettingsService } from './settings/settings.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global prefix
    app.setGlobalPrefix('api');

    // CORS
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Swagger documentation
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

    const port = process.env.PORT || 3001;

    // Middleware de modo manutencao (S5-04)
    const settingsService = app.get(SettingsService);
    app.use((req: any, res: any, next: any) => {
        if (settingsService.isMaintenanceMode()) {
            // Permitir: login + rotas admin + health
            const allowed = ['/api/auth/login', '/api/settings', '/api/health'];
            const isAllowed =
                allowed.some(p => req.path.startsWith(p)) ||
                req.headers['x-admin-bypass'] === process.env.MAINTENANCE_KEY;
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

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CitiesModule } from './cities/cities.module';
import { GroupsModule } from './groups/groups.module';
import { CoursesModule } from './courses/courses.module';
import { TrucksModule } from './trucks/trucks.module';
import { TripsModule } from './trips/trips.module';
import { ClassesModule } from './classes/classes.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { StudentsModule } from './students/students.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AcoesModule } from './acoes/acoes.module';
import { ContasPagarModule } from './contas-pagar/contas-pagar.module';
import { TruckMaintenanceModule } from './truck-maintenance/truck-maintenance.module';
import { EmployeesModule } from './employees/employees.module';
// REQ-08: Feriados e recálculo automático de datas de turmas
import { HolidayModule } from './holiday/holiday.module';
// REQ-10: Portal de reembolso (despesas de campo com foto do recibo)
import { ReimbursementModule } from './reimbursement/reimbursement.module';
// REQ-11/12: Relatórios PDF (lista de frequência e concludentes) — MODELO PROVISÓRIO
import { ReportsModule } from './reports/reports.module';
// REQ-06: Certificados digitais de conclusão
import { CertificateModule } from './certificates/certificate.module';
// REQ-14: Configurações globais de segurança e sistema
import { SettingsModule } from './settings/settings.module';
// SF-01: WebSocket real-time (notificações ao vivo)
import { NotificationsModule } from './notifications/notifications.module';
// SF-02: Auditoria — registra ações críticas em audit_logs (@Global)
import { AuditLogModule } from './audit-log/audit-log.module';
// EXEC-IMPREVISTOS: Módulo de ausências/imprevistos multi-perfil
import { AbsencesModule } from './absences/absences.module';
// FASE 1/2: Rastreamento de motoristas em tempo real (LGPD cleanup + ETA + mapa)
import { DriverLocationModule } from './driver-location/driver-location.module';
// FEEDBACK-PIX: Módulo de feedback pós-curso + recompensa PIX
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { HealthModule } from './health/health.module';
// EST-01: Módulo de Estoque (StockItem / TruckStockItem / StockMovement / StockPurchaseRequest)
import { StockModule } from './stock/stock.module';
// CADASTRO-LINK: Upload público anônimo (PDF/imagem) para cadastro de funcionários via link
import { PublicUploadModule } from './public-upload/public-upload.module';
// WHATSAPP: Integração Z-API — disparos automáticos de mensagens (@Global)
import { WhatsAppModule } from './whatsapp/whatsapp.module';


@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        // SEGURANÇA: rate limiting global — evita abuse de endpoints como /geocode
        // Limites padrão: 60 req/min por IP. Endpoints sensíveis sobrescrevem via @Throttle()
        ThrottlerModule.forRoot([{
            name: 'default',
            ttl: 60000,
            limit: 60,
        }]),
        MailModule,
        PrismaModule,
        AuthModule,
        UsersModule,
        CitiesModule,
        GroupsModule,
        CoursesModule,
        TrucksModule,
        TripsModule,
        ClassesModule,
        EnrollmentsModule,
        StudentsModule,
        DashboardModule,
        AcoesModule,
        ContasPagarModule,
        TruckMaintenanceModule,
        EmployeesModule,
        HolidayModule,       // REQ-08
        ReimbursementModule, // REQ-10
        ReportsModule,       // REQ-11/12: PDFs provisórios
        CertificateModule,   // REQ-06: Portal do Aluno
        SettingsModule,      // REQ-14: Configurações de segurança (@Global)
        NotificationsModule, // SF-01: WebSocket real-time (@Global)
        AuditLogModule,      // SF-02: Auditoria de ações (@Global)
        AbsencesModule,      // EXEC-IMPREVISTOS: Ausências/Imprevistos multi-perfil
        DriverLocationModule, // FASE 1/2: Rastreamento GPS motoristas em tempo real
        FeedbacksModule,     // FEEDBACK-PIX: Feedback pós-curso + recompensa PIX
        InstitutionsModule, // F7: multi-instituição (white-label)
        HealthModule,         // Probes: GET /api/health, GET /api/ready
        StockModule,          // EST-01: Módulo de Estoque
        PublicUploadModule,   // POST /api/public/upload — cadastro público (funcionário, inscrição, etc.)
        WhatsAppModule,       // WHATSAPP: Integração Z-API — disparos automáticos (@Global)
    ],
    providers: [
        // ThrottlerGuard global — aplica rate limiting em TODOS os endpoints
        // Geocode endpoint sobrescreve para limite mais restrito: @Throttle({ default: { limit: 5, ttl: 60000 } })
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule {}


import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
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


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
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
    ],
})
export class AppModule {}

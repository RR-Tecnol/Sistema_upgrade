import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EnrollmentsService } from './src/enrollments/enrollments.service';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
    console.log('⏳ Inicializando o contexto da aplicação para simular o portal...');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
    
    const enrollmentsService = app.get(EnrollmentsService);
    const prisma = app.get(PrismaService);

    // Busca a primeira turma com vagas abertas
    const classData = await prisma.class.findFirst({
        where: { status: 'ENROLLMENT_OPEN' },
        include: { course: true }
    });

    if (!classData) {
        console.error('❌ Não há turmas com inscrições abertas no banco.');
        await app.close();
        process.exit(1);
    }

    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    const cpfFake = `123456${randomSuffix}00`.slice(0, 11);
    const phone = '5598984161367';

    console.log(`\n👨‍🎓 Simulando aluno preenchendo o formulário de matrícula online...`);
    console.log(`📍 Turma Selecionada: ${classData.course.name}`);
    console.log(`📱 Telefone para disparo: ${phone}\n`);

    // Pega um aluno e uma turma existentes do banco de dados (que criamos no seed)
    const student = await prisma.student.findFirst({ include: { user: true } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    
    // Atualiza o telefone do aluno no banco para o seu número
    await prisma.user.update({
        where: { id: student!.userId },
        data: { phone }
    });
    await prisma.studentContact.update({
        where: { studentId: student!.id },
        data: { phone, hasWhatsapp: true, allowWhatsappContact: true }
    });

    console.log(`\n👨‍🎓 Simulando o Administrador fazendo e aprovando matrícula no painel...`);
    console.log(`📍 Turma Selecionada: ${classData.course.name}`);
    console.log(`📱 Telefone do Aluno (${student!.user.name}): ${phone}\n`);

    try {
        // Remove inscrição existente para não dar erro "Aluno já inscrito nesta turma"
        await prisma.enrollment.deleteMany({
            where: { studentId: student!.id, classId: classData.id }
        });

        // 1. Administrador inscreve o aluno manualmente (Fica pendente)
        const enrollment = await enrollmentsService.adminEnroll(student!.id, classData.id);
        
        // 2. Administrador APROVA a inscrição (Isso que dispara o WhatsApp de Aprovação!)
        await enrollmentsService.approve(enrollment.id, admin!.id, 'Aprovado via script de testes');

        console.log(`✅ Inscrição Aprovada! Protocolo: ${enrollment.protocol}`);
        console.log(`📲 O sistema acabou de acionar os WebSockets do Admin e disparar o WhatsApp do Aluno!`);
        console.log(`👉 Aguarde uns segundos e veja se o WhatsApp chegou.`);
    } catch (error: any) {
        console.error('❌ Erro na matrícula/aprovação:', error.message);
    }

    await app.close();
}

bootstrap();

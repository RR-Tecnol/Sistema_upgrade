import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { WhatsAppService } from './src/whatsapp/whatsapp.service';

async function bootstrap() {
    console.log('⏳ Inicializando o sistema (isso garante que testaremos o código real do backend)...');
    
    // Inicia o contexto da aplicação exatamente como em produção
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
    
    // Pega o serviço oficial do WhatsApp que acabamos de configurar
    const whatsappService = app.get(WhatsAppService);

    // Pega o número que você passar no comando
    const phone = process.argv[2];
    
    if (!phone) {
        console.error('❌ Por favor, informe um número de telefone com DDD. Exemplo:');
        console.error('npx ts-node test-whatsapp.ts 5598999999999');
        await app.close();
        process.exit(1);
    }

    console.log(`\n📱 Enviando simulação de Inscrição Recebida para o número: ${phone}`);
    console.log('Enviando via Z-API...\n');

    try {
        const protocol = 'UPG-TEST-' + Math.floor(Math.random() * 10000);
        const msg = `🎓 *Olá, Usuário Teste!*\n\nSua inscrição no curso *Piloto Z-API* foi recebida com sucesso! ✅\n\n📋 Protocolo: \`${protocol}\`\n\nAguarde a análise da nossa equipe. Em breve você receberá a confirmação.\n\n_Sistema Upgrade_`;
        
        await whatsappService.sendText(phone, msg);
        
        console.log('\n✅ Script finalizado! A requisição foi enviada para a Z-API.');
        console.log('👉 Olhe no seu celular se a mensagem chegou (pode levar de 1 a 3 segundos).');
    } catch (error: any) {
        console.error('❌ Erro inesperado durante o teste:', error.message);
    }

    await app.close();
}

bootstrap();

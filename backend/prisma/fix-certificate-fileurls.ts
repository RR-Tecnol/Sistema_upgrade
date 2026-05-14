import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCertificateFileUrls() {
    const certs = await prisma.certificate.findMany({
        where: { OR: [{ fileUrl: '' }, { fileUrl: null }] },
        select: { id: true, verificationCode: true, fileUrl: true },
    });

    console.log(`Certificados com fileUrl vazio: ${certs.length}`);

    if (certs.length === 0) {
        console.log('Nenhum certificado precisa de correcao. Verificando todos...');
        const all = await prisma.certificate.findMany({
            select: { id: true, verificationCode: true, fileUrl: true },
        });
        console.log('Total de certificados:', all.length);
        all.forEach(c => console.log(` - ${c.verificationCode} | fileUrl: "${c.fileUrl}"`));
        await prisma.$disconnect();
        return;
    }

    for (const cert of certs) {
        const fileUrl = `/api/certificates/download/${cert.verificationCode}`;
        await prisma.certificate.update({
            where: { id: cert.id },
            data: { fileUrl },
        });
        console.log(`Atualizado: ${cert.verificationCode} -> ${fileUrl}`);
    }

    console.log('Concluido!');
    await prisma.$disconnect();
}

fixCertificateFileUrls().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Procurando Admin...');
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
        console.error('Nenhum admin encontrado!');
        return;
    }

    const defaultCoordinates = {
        nameX: 420, nameY: 255, nameSize: 24,
        detailsY: 212, detailsSize: 11,
        qrX: 740, qrY: 28, qrSize: 64,
        paragraphX: 95, paragraphY: 220, paragraphW: 700, paragraphH: 165,
        bodyTextSize: 17,
        line1Y: 328, line2Y: 298, line3Y: 268,
        p2CourseBoxX: 255, p2CourseBoxY: 575, p2CourseBoxW: 350, p2CourseBoxH: 44, p2CourseTextSize: 15,
    };
    const defaultTextOverrides = {
        drawHeaderNameAndDetails: false,
        useBodyWhiteMask: false,
        usePage2TitleWhiteMask: false,
        signatureMode: 'AUTO',
    };

    const masters = [
        { state: 'MA', scope: 'STATE', title: 'Molde Mestre — Maranhão', imagePath: '/public/certificados/maranhao/fundo-limpo.png' },
        { state: 'PI', scope: 'STATE', title: 'Molde Mestre — Piauí', imagePath: '/public/certificados/piaui/fundo-limpo.png' },
        { state: null, scope: 'GLOBAL', title: 'Molde Mestre — Padrão (Global)', imagePath: '/public/certificados/maranhao/fundo-limpo.png' }
    ];

    for (const m of masters) {
        const stateKey = m.state ? m.state : 'ANY';
        const key = `${m.scope}:ANY:${stateKey}`;
        const tpl = await prisma.certificateTemplate.upsert({
            where: { key },
            create: { key, scope: m.scope, state: m.state, isActive: true },
            update: { scope: m.scope, state: m.state, isActive: true }
        });

        // Apagar versões antigas para garantir id limpo
        await prisma.certificateTemplateVersion.deleteMany({ where: { templateId: tpl.id } });

        const version = await prisma.certificateTemplateVersion.create({
            data: {
                templateId: tpl.id,
                version: 1,
                title: m.title,
                templateType: 'PDF_BASE',
                pdfPath: m.imagePath,
                coordinateOverrides: defaultCoordinates,
                pdfTextOverrides: defaultTextOverrides,
                placeholders: ['ALUNO_NOME', 'CURSO_NOME', 'CARGA_HORARIA', 'CIDADE', 'ESTADO', 'DATA_EMISSAO', 'CODIGO_VERIFICACAO', 'QR_CODE_DATA_URL', 'TURMA', 'EMISSOR'],
                notes: `Molde mestre para o estado ${m.state}.`,
                status: 'PUBLISHED',
                createdById: admin.id,
                publishedAt: new Date()
            }
        });

        await prisma.certificateTemplate.update({
            where: { id: tpl.id },
            data: { currentVersionId: version.id }
        });
        console.log(`Molde Mestre para ${m.state} recriado com sucesso!`);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(() => {
    prisma.$disconnect();
});

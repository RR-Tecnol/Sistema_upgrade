import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.user.findFirst().then((u: any) => {
    console.log('Fields:', Object.keys(u ?? {}));
    console.log('requiresPasswordChange:', u?.requiresPasswordChange);
    console.log('requiresTwoFactorSetup:', u?.requiresTwoFactorSetup);
    console.log('role:', u?.role);
    console.log('email:', u?.email);
}).catch((e: any) => console.error(e.message)).finally(() => p.$disconnect());

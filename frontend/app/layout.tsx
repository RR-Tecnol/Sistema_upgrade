import type { Metadata } from 'next'
import './globals.css'

function getMetadataBaseUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010').trim();
    try {
        // Evita 500 no build/runtime se a env tiver URL inválida
        return new URL(raw).origin;
    } catch {
        return 'http://localhost:3010';
    }
}

const siteUrl = getMetadataBaseUrl();

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: 'UPGRADE — Plataforma de Qualificação Profissional',
    description: 'Sistema de gestão de cursos profissionalizantes, turmas, alunos e certificações da Upgrade.',
    keywords: ['upgrade', 'qualificação', 'cursos', 'gestão', 'profissional', 'certificação'],
    icons: { icon: '/favicon.svg' },
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body style={{ fontFamily: 'Inter, sans-serif' }}>
                {children}
            </body>
        </html>
    )
}

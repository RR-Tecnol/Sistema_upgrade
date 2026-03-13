import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'UPGRADE — Plataforma de Qualificação Profissional',
    description: 'Sistema de gestão de cursos profissionalizantes, turmas, alunos e certificações da Upgrade.',
    keywords: ['upgrade', 'qualificação', 'cursos', 'gestão', 'profissional', 'certificação'],
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body style={{ fontFamily: 'Inter, sans-serif' }}>
                {children}
            </body>
        </html>
    )
}

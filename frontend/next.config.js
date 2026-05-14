/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    experimental: {
        /** Compatível com Next 14.2.x — evita chunk de axios quebrado no servidor. */
        serverComponentsExternalPackages: ['axios'],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    },
    images: {
        domains: ['localhost', 'sistemaupgrade.com.br', 'www.sistemaupgrade.com.br'],
    },

    /**
     * Proxy: /api/* → http://localhost:3001/api/*
     *
     * Sem esta regra, o Next.js intercepta qualquer URL /api/... como
     * rota interna (Next.js API Routes) e retorna 404 antes de chegar ao backend.
     *
     * Impacto imediato:
     *   - GET /api/certificates/download/:code  → Puppeteer gera PDF (agora funciona)
     *   - GET /api/certificates/verify/:code    → verificação pública (agora funciona)
     *   - Todos os outros fetch('/api/...') com URL relativa navegados diretamente
     *
     * Em produção: substitua 'http://localhost:3001' pelo domínio real do backend.
     */
    async redirects() {
        return [{ source: '/favicon.ico', destination: '/favicon.svg', permanent: false }];
    },

    async rewrites() {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
}

module.exports = nextConfig

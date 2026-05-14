/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        /** Compatível com Next 14.2.x — evita chunk de axios quebrado no servidor. */
        serverComponentsExternalPackages: ['axios'],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api',
    },
    images: {
        domains: ['localhost'],
    },

    /**
     * Proxy: /api/* → http://localhost:3002/api/*
     *
     * Sem esta regra, o Next.js intercepta qualquer URL /api/... como
     * rota interna (Next.js API Routes) e retorna 404 antes de chegar ao backend.
     *
     * Impacto imediato:
     *   - GET /api/certificates/download/:code  → Puppeteer gera PDF (agora funciona)
     *   - GET /api/certificates/verify/:code    → verificação pública (agora funciona)
     *   - POST /api/public/upload               → cadastro público (documentos)
     *   - GET /storage/:path*                   → proxy para MinIO (pré-visualização de ficheiros)
     *   - Todos os outros fetch('/api/...') com URL relativa navegados diretamente
     *
     * Em produção: substitua BACKEND_URL e MINIO_PUBLIC_BROWSER_URL pelos domínios reais.
     */
    async redirects() {
        return [{ source: '/favicon.ico', destination: '/favicon.svg', permanent: false }];
    },

    async rewrites() {
        const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3002').replace(/\/$/, '');
        const minioBrowser = (process.env.MINIO_PUBLIC_BROWSER_URL || 'http://localhost:9010').replace(/\/$/, '');
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
            {
                source: '/storage/:path*',
                destination: `${minioBrowser}/:path*`,
            },
        ];
    },
}

module.exports = nextConfig

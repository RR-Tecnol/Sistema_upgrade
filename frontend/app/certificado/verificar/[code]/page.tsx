import type { Metadata } from 'next';
import { VerifyCertificateClient } from './verify-certificate-client';
import type { PublicCertificateVerification } from '../../../../lib/api/certificates';

type Props = {
  params: { code: string };
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api').replace(/\/$/, '');
}

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010').replace(/\/$/, '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = params.code;
  if (!code) {
    return {
      title: 'Verificação de certificado | UPGRADE',
      description: 'Valide a autenticidade de certificados emitidos pela plataforma.',
    };
  }

  const url = `${apiBase()}/certificates/verify/${encodeURIComponent(code)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) {
      return {
        title: 'Verificação de certificado | UPGRADE',
        description: 'Valide a autenticidade de certificados emitidos pela plataforma.',
        openGraph: {
          title: 'Verificação de certificado',
          description: 'Valide a autenticidade de certificados digitais.',
          siteName: 'UPGRADE',
          locale: 'pt_BR',
          type: 'website',
        },
        twitter: {
          card: 'summary',
          title: 'Verificação de certificado | UPGRADE',
        },
      };
    }
    const data = (await res.json()) as PublicCertificateVerification;
    const title = data.ogShare?.title ?? 'Verificação de certificado | UPGRADE';
    const description =
      data.ogShare?.description ??
      'Verificação pública de autenticidade de certificados digitais emitidos pela plataforma UPGRADE.';
    const pageUrl = `${siteBase()}/certificado/verificar/${encodeURIComponent(code)}`;
    const ogImageUrl = `${siteBase()}/api/certificates/verify/${encodeURIComponent(code)}/image`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'UPGRADE',
        locale: 'pt_BR',
        url: pageUrl,
        images:
          data.status === 'ACTIVE'
            ? [
                {
                  url: ogImageUrl,
                  width: 1200,
                  height: 630,
                  alt: 'Certificado verificado — UPGRADE',
                },
              ]
            : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: data.status === 'ACTIVE' ? [ogImageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: 'Verificação de certificado | UPGRADE',
      description: 'Valide a autenticidade de certificados emitidos pela plataforma.',
    };
  }
}

/** ISR: metadados e cache de resposta de verificação (código por URL). */
export const revalidate = 120;

export default function VerifyCertificatePage() {
  return <VerifyCertificateClient />;
}

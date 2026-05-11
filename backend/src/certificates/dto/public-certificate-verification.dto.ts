/**
 * Resposta pública mínima para GET /certificates/verify/:code
 * (sem id internos, matrícula, CPF ou dados que permitam enumeração).
 */
export interface PublicCertificateVerificationDto {
  status: 'ACTIVE' | 'CANCELLED';
  /** Nome parcial para exibição (privacidade). */
  studentNameObfuscated: string;
  courseName: string;
  workloadHours: number;
  issuedAt: string;
  /** Instituição (curso → institution ou env; para UI e rodapé). */
  institutionName: string;
  /** URL da logo (instituição, ou .env) — ex.: `/assets/logo.png` */
  institutionLogoUrl?: string | null;
  siteUrl?: string | null;
  /** Cor de marca (hex) para cabeçalho/botões na verificação pública */
  primaryColor?: string | null;
  verificationCode: string;
  /** Título/descrição para OpenGraph (Next.js generateMetadata). */
  ogShare?: {
    title: string;
    description: string;
  };
}

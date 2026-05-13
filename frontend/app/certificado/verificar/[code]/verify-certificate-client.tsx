'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import type { PublicCertificateVerification } from '../../../../lib/api/certificates';
import styles from './verify-page.module.css';

const QRCodeSVG = dynamic(() => import('qrcode.react').then((m) => m.QRCodeSVG), { ssr: false });

type Phase = 'scan' | 'result' | 'error';

function maskVerificationCode(code: string) {
  if (code.length <= 8) return '••••••••';
  return `${code.slice(0, 4)}•••${code.slice(-4)}`;
}

const SUPPORT_HREF =
  process.env.NEXT_PUBLIC_SUPPORT_URL ||
  (process.env.NEXT_PUBLIC_SUPPORT_EMAIL
    ? `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`
    : 'mailto:suporte@upgradeeducacional.com.br');

export function VerifyCertificateClient() {
  const params = useParams();
  const code = params.code as string;
  const [phase, setPhase] = useState<Phase>('scan');
  const [data, setData] = useState<PublicCertificateVerification | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    setShareUrl(typeof window !== 'undefined' ? window.location.href : '');
  }, []);

  const runVerify = useCallback(async () => {
    if (!code) return;
    setPhase('scan');
    setLoadError(false);
    setData(null);
    const minMs = 1400;
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code)}`);
      const elapsed = performance.now() - t0;
      if (minMs - elapsed > 0) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }
      if (!res.ok) {
        setLoadError(true);
        setPhase('error');
        return;
      }
      const json = (await res.json()) as PublicCertificateVerification;
      setData(json);
      setPhase('result');
    } catch {
      if (minMs - (performance.now() - t0) > 0) {
        await new Promise((r) => setTimeout(r, minMs - (performance.now() - t0)));
      }
      setLoadError(true);
      setPhase('error');
    }
  }, [code]);

  useEffect(() => {
    runVerify();
  }, [runVerify]);

  const issued = data?.issuedAt
    ? new Date(data.issuedAt).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const logoSrc =
    data?.institutionLogoUrl && !data.institutionLogoUrl.startsWith('http')
      ? `${siteBase}${data.institutionLogoUrl}`
      : data?.institutionLogoUrl || '';
  const brandBoxColor = data?.primaryColor || '#fbbf24';
  const instName = data?.institutionName || 'UPGRADE';

  return (
    <div
      className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-8"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {/* ambient */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.25), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(168, 85, 247, 0.12), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(255, 214, 0, 0.08), transparent)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-2 flex-wrap">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-10 max-w-[200px] object-contain"
                style={{ filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.35))' }}
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20"
                style={{
                  background: `linear-gradient(135deg, ${brandBoxColor}, #0f172acc)`,
                }}
              >
                <span className="text-xs font-black text-slate-100" style={{ fontFamily: 'Orbitron, system-ui' }}>
                  {instName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span
              className="text-lg font-black tracking-[0.12em] text-slate-100"
              style={{
                fontFamily: 'Orbitron, system-ui',
                color: data?.primaryColor || undefined,
              }}
            >
              {instName}
            </span>
          </div>
          <p className="text-xs text-slate-400 tracking-widest uppercase">Verificação pública de autenticidade</p>
        </header>

        {phase === 'scan' && (
          <div
            className={clsx(
              'relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-cyan-500/5',
            )}
          >
            <div className={styles.scanOverlay} />
            <div className="relative z-10 flex flex-col items-center w-full min-h-[200px] justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className={styles.pulseRing} />
                <div
                  className="relative h-14 w-14 rounded-full border-2 border-cyan-400/50 flex items-center justify-center"
                  style={{ boxShadow: '0 0 32px rgba(34, 211, 238, 0.25)' }}
                >
                  <div className={styles.hex} />
                </div>
              </div>
              <p className="mt-6 font-mono text-[0.65rem] text-cyan-300/80 tracking-[0.3em] uppercase">Decodificando registo</p>
              <p className="mt-2 text-sm text-slate-400">Validando código na base segura…</p>
              <div className="mt-6 w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                <div className={styles.indeterminateBar} />
              </div>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 backdrop-blur-xl p-8 text-center shadow-xl">
            <div className="text-4xl mb-3 opacity-90" aria-hidden>
              ◇
            </div>
            <h2
              className="text-sm font-bold tracking-widest text-rose-300/90 mb-2 uppercase"
              style={{ fontFamily: 'Orbitron, system-ui' }}
            >
              Código inválido ou indisponível
            </h2>
            {loadError && code && (
              <p className="text-sm text-slate-400 leading-relaxed mb-6 break-all font-mono text-xs opacity-80">
                Nenhum certificado ativo corresponde a este código.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => runVerify()}
                className="rounded-xl bg-slate-800 border border-slate-600/80 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Tentar novamente
              </button>
              <a
                href={SUPPORT_HREF}
                className="rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 hover:from-cyan-500 hover:to-sky-500 transition-colors text-center"
              >
                Falar com suporte
              </a>
            </div>
          </div>
        )}

        {phase === 'result' && data && data.status === 'CANCELLED' && (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-950/25 backdrop-blur-xl p-8 text-center">
            <div className="text-4xl mb-3" aria-hidden>
              ⚠
            </div>
            <h2
              className="text-sm font-bold tracking-widest text-amber-200/95 mb-2 uppercase"
              style={{ fontFamily: 'Orbitron, system-ui' }}
            >
              Certificado cancelado
            </h2>
            <p className="text-sm text-slate-400 mb-6">Este registo foi invalidado e não constitui prova de conclusão.</p>
            <a
              href={SUPPORT_HREF}
              className="inline-block rounded-xl bg-slate-800/80 border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-200"
            >
              Dúvidas? Suporte
            </a>
          </div>
        )}

        {phase === 'result' && data && data.status === 'ACTIVE' && (
          <div className="space-y-6">
            <div
              className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-slate-900/70 backdrop-blur-2xl shadow-2xl"
              style={{ boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.12), 0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="flex flex-col items-center gap-3 mb-6 sm:flex-row sm:justify-center">
                  <span className={clsx('relative flex h-3 w-3', styles.checkDot)} aria-hidden>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <div className={styles.checkTextWrap}>
                    <span
                      className="text-xs font-extrabold tracking-[0.2em] text-emerald-300/95 uppercase"
                      style={{ fontFamily: 'Orbitron, system-ui' }}
                    >
                      Certificado autêntico
                    </span>
                    <span className={styles.checkmark} title="ok" aria-hidden />
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div className="rounded-xl bg-slate-950/50 border border-slate-700/60 p-4">
                    <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1">Aluno (parcial)</div>
                    <div className="text-lg font-semibold text-white tracking-tight">
                      {data.studentNameObfuscated}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                      <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1">Curso</div>
                      <div className="text-sm font-medium text-slate-200 leading-snug">{data.courseName}</div>
                    </div>
                    <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                      <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1">Carga horária</div>
                      <div className="text-sm font-medium text-slate-200">{data.workloadHours}h</div>
                    </div>
                    <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3 sm:col-span-2">
                      <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1">Emitido em</div>
                      <div className="text-sm font-medium text-slate-200">{issued}</div>
                    </div>
                    <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3 sm:col-span-2">
                      <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1">Instituição</div>
                      <div className="text-sm font-medium text-slate-200">{data.institutionName}</div>
                    </div>
                    <div className="rounded-xl bg-slate-950/20 border border-dashed border-slate-700 p-3 sm:col-span-2">
                      <div className="text-[0.6rem] uppercase tracking-widest text-slate-500 mb-1">Código (mascarado)</div>
                      <div className="text-xs font-mono text-slate-500">{maskVerificationCode(data.verificationCode)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <a
              href={`/api/certificates/download/${encodeURIComponent(data.verificationCode)}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-200/40 transition hover:scale-[1.01] active:scale-[0.99]"
            >
              Visualizar PDF original
            </a>

            {shareUrl ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-800/80 py-3.5 text-sm font-semibold text-sky-300 transition hover:border-sky-500/50 hover:bg-slate-800"
                >
                  <span className="font-bold text-sky-400">in</span> Compartilhar no LinkedIn
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Acabei de concluir meu certificado com a ${instName}! Confira: ${shareUrl}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="rounded-2xl border border-emerald-700/50 bg-emerald-950/40 py-3.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/50"
                >
                  Compartilhar no WhatsApp
                </button>
              </div>
            ) : null}

            {shareUrl ? (
              <div className="text-center">
                <div className="inline-flex p-3 rounded-2xl bg-slate-900/60 border border-slate-700/80">
                  <QRCodeSVG value={shareUrl} size={112} level="H" fgColor="#e2e8f0" bgColor="transparent" />
                </div>
                <p className="mt-2 text-[0.7rem] text-slate-500">Este link confirma a mesma verificação</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

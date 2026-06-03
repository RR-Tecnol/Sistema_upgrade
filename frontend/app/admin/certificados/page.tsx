'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';
import api from '@/lib/api/client';
import dynamic from 'next/dynamic';
import Draggable from 'react-draggable';
import { customConfirm, customAlert } from '@/components/ui/ConfirmModal';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import AdminCollapsibleTutorial from '@/components/admin/AdminCollapsibleTutorial';
import AdminViewModeToggle from '@/components/admin/AdminViewModeToggle';
import { CERTIFICATE_EDITOR_TUTORIAL_STEPS } from './certificate-tutorial-steps';
import AnimatedKpiCard from '@/components/admin/AnimatedKpiCard';
import { usePersistedAdminViewMode } from '@/hooks/usePersistedAdminViewMode';
import { formatCertificateIssueError } from '@/lib/certificate-issue-error';
import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { AdminListPagination } from '@/components/admin/AdminListPagination';
import { normalizePaginated, unwrapListData, ADMIN_PAGE_SIZE_TABLE } from '@/lib/api/pagination';
import { getTemplateBadge } from '@/lib/certificates/templateLabels';
import { toast } from '@/components/ui/Toast';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false });

function CertificateTutorial() {
    return (
        <AdminCollapsibleTutorial
            storageKey="cert-tutorial-expanded"
            emoji="📚"
            title="COMO USAR O EDITOR DE CERTIFICADOS"
            steps={CERTIFICATE_EDITOR_TUTORIAL_STEPS}
        />
    );
}

/** Painel focado em PDF_BASE: preview real via backend (pdf-lib), sem editor HTML. */

interface Certificate {
    id: string;
    studentId: string;
    classId: string;
    verificationCode: string;
    issuedAt: string;
    status: string;
    fileUrl?: string | null;
    student: { user: { name: string }; cpf: string };
    class: { classIdentifier: string; course: { name: string; workloadHours: number } };
    issuer: { name: string };
}

interface EligibleStudent {
    id: string;
    name: string;
    cpf: string;
    enrollmentId: string;
    classId: string;
    courseName: string;
    classIdentifier: string;
    /** Presença efectiva já com penalidades de imprevisto (motor único). */
    attendanceRate: number;
    attendanceRateBeforePenaltyPct?: number;
    imprevistoPenaltyPctSum?: number;
    riskLevel?: 'ok' | 'watch' | 'risk' | 'critical';
}

interface CourseOption {
    id: string;
    name: string;
    workloadHours?: number;
}

/** Amostra para substituir placeholders na pré-visualização ao vivo (alinhado ao PdfService). */
type PdfLivePreviewSample = {
    studentName: string;
    courseName: string;
    workload: number;
    cityName: string;
    uf: string;
    issuedAtDisplay: string;
};

function applyPdfTemplateSubstitutions(tmpl: string | undefined, sample: PdfLivePreviewSample): string {
    if (!tmpl || !tmpl.trim()) return '';
    let t = tmpl;
    t = t.replace(/\{\{ALUNO_NOME\}\}/g, sample.studentName);
    t = t.replace(/\{\{CURSO\}\}/g, `**${sample.courseName.toUpperCase()}**`);
    t = t.replace(/\{\{CARGA_HORARIA\}\}/g, String(sample.workload));
    t = t.replace(/\{\{CIDADE\}\}/g, sample.cityName);
    t = t.replace(/\{\{UF\}\}/g, sample.uf);
    t = t.replace(/\{\{DATA_EXTENSO\}\}/g, sample.issuedAtDisplay);
    return t;
}

function renderMarkdownBoldSegments(text: string): ReactNode[] {
    const parts = text.split(/(\*\*.*?\*\*)/g).filter(p => p.length > 0);
    return parts.map((part, i) => {
        const bold = part.startsWith('**') && part.endsWith('**');
        const inner = bold ? part.slice(2, -2) : part;
        return bold ? <strong key={i}>{inner}</strong> : <span key={i}>{inner}</span>;
    });
}

interface AvailablePdfOption {
    name: string;
    path: string;
}

/** Chaves alinhadas com `CertificateCoordinateOverrides` no backend (pontos PDF). */
const COORDINATE_FIELD_KEYS: { key: string; label: string; hint?: string }[] = [
    { key: 'nameX', label: 'Nome — centro X' },
    { key: 'nameY', label: 'Nome — baseline Y' },
    { key: 'nameSize', label: 'Nome — tamanho' },
    { key: 'detailsY', label: 'Detalhes — Y' },
    { key: 'detailsSize', label: 'Detalhes — tamanho' },
    { key: 'qrX', label: 'QR — X' },
    { key: 'qrY', label: 'QR — Y' },
    { key: 'qrSize', label: 'QR — lado' },
    { key: 'paragraphX', label: 'Parágrafo — X' },
    { key: 'paragraphY', label: 'Parágrafo — Y' },
    { key: 'paragraphW', label: 'Parágrafo — largura' },
    { key: 'paragraphH', label: 'Parágrafo — altura' },
    { key: 'bodyTextSize', label: 'Corpo — tamanho' },
    { key: 'line1Y', label: 'Linha 1 — Y' },
    { key: 'line2Y', label: 'Linha 2 — Y' },
    { key: 'line3Y', label: 'Linha 3 — Y' },
    { key: 'p2CourseBoxX', label: 'Pág.2 — caixa X' },
    { key: 'p2CourseBoxY', label: 'Pág.2 — caixa Y' },
    { key: 'p2CourseBoxW', label: 'Pág.2 — largura' },
    { key: 'p2CourseBoxH', label: 'Pág.2 — altura' },
    { key: 'p2CourseTextSize', label: 'Pág.2 — título' },
    { key: 'dateX', label: 'Data — X' },
    { key: 'dateY', label: 'Data — Y' },
    { key: 'dateSize', label: 'Data — tamanho' },
    { key: 'syllabusY', label: 'Conteúdo — Y inicial' },
    { key: 'syllabusCol1X', label: 'Conteúdo Col1 — X' },
    { key: 'syllabusCol2X', label: 'Conteúdo Col2 — X' },
    { key: 'syllabusCol3X', label: 'Conteúdo Col3 — X' },
    { key: 'syllabusCol1W', label: 'Conteúdo Col1 — largura' },
    { key: 'syllabusCol3W', label: 'Conteúdo Col3 — largura' },
    { key: 'syllabusTextSize', label: 'Conteúdo — tamanho texto' },
    { key: 'p2WorkloadX', label: 'Pág.2 Carga Hor. — X' },
    { key: 'p2WorkloadY', label: 'Pág.2 Carga Hor. — Y' },
    { key: 'p2WorkloadSize', label: 'Pág.2 Carga Hor. — tamanho' },
    { key: 'p2WorkloadW', label: 'Pág.2 Carga Hor. — largura' },
    { key: 'p2QrX', label: 'QR Pág.2 — X' },
    { key: 'p2QrY', label: 'QR Pág.2 — Y' },
    { key: 'p2QrSize', label: 'QR Pág.2 — lado' },
];

const DEFAULT_COORDINATE_OVERRIDES: Record<string, string> = {
    nameX: '420',
    nameY: '255',
    nameSize: '24',
    detailsY: '212',
    detailsSize: '11',
    qrX: '740',
    qrY: '28',
    qrSize: '64',
    paragraphX: '95',
    paragraphY: '220',
    paragraphW: '700',
    paragraphH: '165',
    bodyTextSize: '17',
    line1Y: '328',
    line2Y: '298',
    line3Y: '268',
    p2CourseBoxX: '421',
    p2CourseBoxY: '575',
    p2CourseBoxW: '350',
    p2CourseBoxH: '44',
    p2CourseTextSize: '15',
};

/** Moldes Mestres por UF — coordenadas calibradas com base nos PDFs reais */
const MASTER_PRESETS: Record<string, {
    pdfPath: string;
    coords: Record<string, string>;
    texts: { paragraph: string; date: string; p2Workload: string; drawHeader: boolean };
}> = {
    MA: {
        pdfPath: 'certificados/maranhao/fundo-limpo.png',
        coords: {
            // Nome: centralizado, ~60% de altura da página MA
            nameX: '420', nameY: '370', nameSize: '26',
            detailsY: '330', detailsSize: '10',
            // QR Code: canto inferior central (visível na screenshot do PDF)
            qrX: '350', qrY: '135', qrSize: '64',
            // Parágrafo: logo abaixo do nome
            paragraphX: '60', paragraphY: '310', paragraphW: '680', paragraphH: '130',
            bodyTextSize: '14',
            line1Y: '310', line2Y: '284', line3Y: '258',
            // Data: canto inferior esquerdo
            dateY: '120', dateSize: '11',
            // Verso (Pág 2)
            p2CourseBoxX: '421', p2CourseBoxY: '548', p2CourseBoxW: '350', p2CourseBoxH: '44', p2CourseTextSize: '13',
            syllabusY: '490', syllabusCol1X: '40', syllabusCol2X: '290', syllabusCol3X: '350',
            syllabusTextSize: '9', syllabusCol1W: '240', syllabusCol3W: '420',
            p2WorkloadX: '330', p2WorkloadY: '65', p2WorkloadSize: '14', p2WorkloadW: '520',
        },
        texts: {
            paragraph: 'Certificamos que **{{ALUNO_NOME}}** participou e concluiu o curso de **{{CURSO}}**, com carga horária de **{{CARGA_HORARIA}} horas**, promovido pela SEDUC/MA.',
            date: 'São Luís - MA, {{DATA_EXTENSO}}',
            p2Workload: '**{{CARGA_HORARIA}}H** CARGA HORÁRIA TOTAL',
            drawHeader: true,
        },
    },
    PI: {
        pdfPath: 'certificados/piaui/fundo-limpo.png',
        coords: {
            // Nome: centralizado, layout PI ligeiramente mais alto
            nameX: '420', nameY: '355', nameSize: '24',
            detailsY: '318', detailsSize: '10',
            // QR Code: canto inferior
            qrX: '345', qrY: '128', qrSize: '62',
            // Parágrafo
            paragraphX: '65', paragraphY: '298', paragraphW: '660', paragraphH: '125',
            bodyTextSize: '13',
            line1Y: '298', line2Y: '273', line3Y: '248',
            // Data
            dateY: '114', dateSize: '11',
            // Verso (Pág 2)
            p2CourseBoxX: '421', p2CourseBoxY: '548', p2CourseBoxW: '350', p2CourseBoxH: '44', p2CourseTextSize: '13',
            syllabusY: '490', syllabusCol1X: '40', syllabusCol2X: '290', syllabusCol3X: '350',
            syllabusTextSize: '9', syllabusCol1W: '240', syllabusCol3W: '420',
            p2WorkloadX: '330', p2WorkloadY: '65', p2WorkloadSize: '14', p2WorkloadW: '520',
        },
        texts: {
            paragraph: 'Certificamos que **{{ALUNO_NOME}}** concluiu com êxito o curso de **{{CURSO}}**, com carga horária de **{{CARGA_HORARIA}} horas**, ofertado pela SETRE/PI.',
            date: 'Teresina - PI, {{DATA_EXTENSO}}',
            p2Workload: '**{{CARGA_HORARIA}}H** CARGA HORÁRIA TOTAL',
            drawHeader: true,
        },
    },
};


interface CertificateTemplateVersion {
    id: string;
    version: number;
    title: string;
    templateType: 'PDF_BASE' | 'HTML';
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
    htmlContent?: string | null;
    cssContent?: string | null;
    pdfPath?: string | null;
    pdfTextOverrides?: Record<string, string | boolean> | null;
    coordinateOverrides?: Record<string, number> | null;
    updatedAt?: string;
}

interface CertificateTemplate {
    id: string;
    key: string;
    scope: 'GLOBAL' | 'COURSE' | 'STATE' | 'COURSE_STATE' | 'PUBLIC_FILE';
    courseId?: string | null;
    state?: string | null;
    course?: { id: string; name: string } | null;
    currentVersion?: CertificateTemplateVersion | null;
    versions?: CertificateTemplateVersion[];
    _count?: { versions: number };
}

const PDF_WIDTH = 841.89;
const PDF_HEIGHT = 595.28;

/**
 * pdf-lib desenha texto com `y` = baseline. No overlay, posicionamos o topo da caixa em
 * baseline + ascendentes ≈ 0,72×em (Helvetica/Montserrat), igual ao fluxo do parágrafo no PDF.
 */
const PDF_BASELINE_TO_TOP_EM = 0.72;

function pdfBaselineToTopY(baselinePdfY: number, fontSizePt: number): number {
    return baselinePdfY + fontSizePt * PDF_BASELINE_TO_TOP_EM;
}

function pdfTopToBaselineY(topPdfY: number, fontSizePt: number): number {
    return Math.round(topPdfY - fontSizePt * PDF_BASELINE_TO_TOP_EM);
}

/** Um bloco do conteúdo programático — serializado com §§§ entre blocos */
interface SyllabusBlock {
    id: string;
    titulos: string;
    cargas: string;
    descricoes: string;
}

const BLOCK_SEP = '\n§§§\n';

function serializeSyllabusBlocks(blocks: SyllabusBlock[]) {
    return {
        syllabusTitleContent: blocks.map(b => b.titulos).join(BLOCK_SEP),
        syllabusWorkloadContent: blocks.map(b => b.cargas).join(BLOCK_SEP),
        syllabusDescContent: blocks.map(b => b.descricoes).join(BLOCK_SEP),
    };
}

function deserializeSyllabusBlocks(title: string, workload: string, desc: string): SyllabusBlock[] {
    const titles = title.split(BLOCK_SEP);
    const workloads = workload.split(BLOCK_SEP);
    const descs = desc.split(BLOCK_SEP);
    const count = Math.max(titles.length, workloads.length, descs.length, 1);
    return Array.from({ length: count }, (_, i) => ({
        id: `${i}-${Date.now()}`,
        titulos: titles[i] ?? '',
        cargas: workloads[i] ?? '',
        descricoes: descs[i] ?? '',
    }));
}

/** Chaves dinâmicas por bloco de ementa (Y e tamanho de fonte). */
function isSyllabusBlockCoordKey(key: string): boolean {
    return /^syllabusBlock\d+(Y|Size)$/.test(key);
}

/** Restaura todas as chaves numéricas (incl. syllabusBlock0Y, syllabusBlock1Y, …). */
function coordinateOverridesToForm(co: unknown): Record<string, string> {
    const next: Record<string, string> = {};
    if (!co || typeof co !== 'object' || Array.isArray(co)) return next;
    for (const [key, v] of Object.entries(co as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
            next[key] = String(v);
        }
    }
    return next;
}

/** Botões − / + para ajustar tamanho de fonte (pt) no editor de coordenadas. */
function CoordFontStepper({
    coordKey,
    value,
    onChange,
    min = 6,
    max = 40,
    step = 1,
}: {
    coordKey: string;
    value: string;
    onChange: (key: string, next: string) => void;
    min?: number;
    max?: number;
    step?: number;
}) {
    const bump = (delta: number) => {
        const cur = Number(value);
        const base = Number.isFinite(cur) ? cur : 12;
        const next = Math.min(max, Math.max(min, base + delta));
        onChange(coordKey, String(next));
    };
    const btnStyle: CSSProperties = {
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '1px solid #D4D4D8',
        background: '#fff',
        color: '#374151',
        fontWeight: 800,
        fontSize: '0.9rem',
        cursor: 'pointer',
        lineHeight: 1,
        padding: 0,
    };
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }} title={`Ajustar ${coordKey}`}>
            <button type="button" style={btnStyle} onClick={() => bump(-step)} aria-label="Diminuir fonte">−</button>
            <button type="button" style={btnStyle} onClick={() => bump(step)} aria-label="Aumentar fonte">+</button>
        </span>
    );
}

interface OverlayProps {
    coordForm: any;
    setCoordForm: any;
    pdfParagraphTemplate?: string;
    pdfDateTemplate?: string;
    pdfPage2WorkloadTemplate?: string;
    previewPage: 1 | 2;
    pdfDrawHeader: boolean;
    /** Valores de exemplo para {{ALUNO_NOME}}, {{CURSO}}, etc. — curso do editor + aluno de teste elegível */
    previewSample: PdfLivePreviewSample;
    /** Blocos estruturados — cada um tem Y próprio no overlay */
    syllabusBlocks?: SyllabusBlock[];
    showQrGhost?: boolean;
    /** Mostrar ghost do QR na Pág. 2 */
    showQrGhostP2?: boolean;
}

function CertificateDraggableOverlay({
    coordForm,
    setCoordForm,
    pdfParagraphTemplate,
    pdfDateTemplate,
    pdfPage2WorkloadTemplate,
    previewPage,
    pdfDrawHeader,
    previewSample,
    syllabusBlocks = [],
    showQrGhost = true,
    showQrGhostP2 = false,
}: OverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            setContainerSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
        });
        obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const pdfToScreenCoords = (pdfX: number, pdfY: number) => {
        if (containerSize.width === 0) return { x: 0, y: 0 };
        const scaleX = containerSize.width / PDF_WIDTH;
        const scaleY = containerSize.height / PDF_HEIGHT;
        const screenX = pdfX * scaleX;
        const screenY = containerSize.height - (pdfY * scaleY);
        return { x: screenX, y: screenY };
    };

    const screenToPdfCoords = (screenX: number, screenY: number) => {
        if (containerSize.width === 0) return { x: 0, y: 0 };
        const scaleX = PDF_WIDTH / containerSize.width;
        const scaleY = PDF_HEIGHT / containerSize.height;
        const pdfX = screenX * scaleX;
        const pdfY = (containerSize.height - screenY) * scaleY;
        return { x: Math.round(pdfX), y: Math.round(pdfY) };
    };

    const handleDragStop = (keyX: string, keyY: string, d: any) => {
        if (typeof d.__pdfBaselineY === 'number' && typeof d.__pdfX === 'number') {
            setCoordForm((prev: any) => ({
                ...prev,
                [keyX]: String(Math.round(d.__pdfX)),
                [keyY]: String(Math.round(d.__pdfBaselineY)),
            }));
            return;
        }
        const coords = screenToPdfCoords(d.x, d.y);
        setCoordForm((prev: any) => ({ ...prev, [keyX]: String(coords.x), [keyY]: String(coords.y) }));
    };

    if (containerSize.width === 0) {
        return <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
    }

    const scale = containerSize.width / PDF_WIDTH;

    const renderDraggable = (
        content: string | undefined | null,
        keyX: string,
        keyY: string,
        defaultX: number,
        defaultY: number,
        fontSize: number,
        isBold: boolean,
        lockX = false,
        lockY = false,
        anchor = 'left',
        opts?: {
            wrap?: boolean;
            maxWidthPx?: number;
            richChildren?: ReactNode;
            /** Alinha ao pdf-lib (y = baseline): topo da caixa = baseline + ascendentes */
            verticalAnchor?: 'pdfBaselineTop' | 'legacyBottom';
        },
    ) => {
        const hasRich = opts?.richChildren != null;
        if ((!content || content.trim() === '') && !hasRich) return null;
        const verticalAnchor = opts?.verticalAnchor ?? (opts?.wrap ? 'pdfBaselineTop' : 'legacyBottom');
        return (
            <DraggableGhostItem
                key={keyX + keyY}
                content={content ?? ''}
                richContent={opts?.richChildren}
                keyX={keyX}
                keyY={keyY}
                px={Number(coordForm[keyX] ?? defaultX)}
                py={Number(coordForm[keyY] ?? defaultY)}
                fontSize={fontSize}
                isBold={isBold}
                scale={scale}
                lockX={lockX}
                lockY={lockY}
                anchor={anchor}
                wrap={opts?.wrap}
                maxWidthPx={opts?.maxWidthPx}
                verticalAnchor={verticalAnchor}
                pdfToScreenCoords={pdfToScreenCoords}
                screenToPdfCoords={screenToPdfCoords}
                handleDragStop={handleDragStop}
            />
        );
    };

    // QR ghost é agora um componente de nível de módulo (ver abaixo) — apenas passamos as props

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 10,
                fontFamily: "'Montserrat', sans-serif"
            }}
        >
            {previewPage === 1 && (
                <>
                    {(() => {
                        const substituted = applyPdfTemplateSubstitutions(pdfParagraphTemplate, previewSample);
                        if (!substituted.trim()) return null;
                        const pw = Number(coordForm.paragraphW ?? 700);
                        const maxWidthPx = Math.max(8, (pw - 20) * scale);
                        return renderDraggable(
                            substituted,
                            'paragraphX',
                            'line1Y',
                            95,
                            328,
                            Number(coordForm.bodyTextSize ?? 12),
                            false,
                            false,
                            false,
                            'left',
                            {
                                wrap: true,
                                maxWidthPx,
                                richChildren: <>{renderMarkdownBoldSegments(substituted)}</>,
                            },
                        );
                    })()}
                    {pdfDrawHeader &&
                        renderDraggable(
                            previewSample.studentName.toUpperCase(),
                            'nameX',
                            'nameY',
                            561,
                            350,
                            Number(coordForm.nameSize ?? 24),
                            true,
                            false,
                            false,
                            'center',
                        )}
                    {(() => {
                        const sub = applyPdfTemplateSubstitutions(pdfDateTemplate, previewSample);
                        if (!sub.trim()) return null;
                        return renderDraggable(
                            sub,
                            'dateX',
                            'dateY',
                            95,
                            228,
                            Number(coordForm.dateSize ?? 12),
                            true,
                            false,
                            false,
                            'left',
                            {
                                richChildren: <>{renderMarkdownBoldSegments(sub)}</>,
                                verticalAnchor: 'pdfBaselineTop',
                            },
                        );
                    })()}
                    {showQrGhost && (
                        <QrGhostItem
                            qrSize={Number(coordForm['qrSize'] ?? 64)}
                            qrX={Number(coordForm['qrX'] ?? 740)}
                            qrY={Number(coordForm['qrY'] ?? 28)}
                            scale={scale}
                            pdfToScreenCoords={pdfToScreenCoords}
                            screenToPdfCoords={screenToPdfCoords}
                            onDragStop={(x: number, y: number) =>
                                setCoordForm((prev: any) => ({ ...prev, qrX: String(x), qrY: String(y) }))
                            }
                        />
                    )}
                </>
            )}

            {previewPage === 2 && (
                <>
                    {renderDraggable(
                        'CURSO DE ' + previewSample.courseName.toUpperCase(),
                        'p2CourseBoxX',
                        'p2CourseBoxY',
                        421,
                        515,
                        Number(coordForm.p2CourseTextSize ?? 15),
                        true,
                        false,
                        false,
                        'center',
                        { verticalAnchor: 'pdfBaselineTop' },
                    )}
                    {(() => {
                        const sub = applyPdfTemplateSubstitutions(pdfPage2WorkloadTemplate, previewSample);
                        if (!sub.trim()) return null;
                        const p2WlW = Number(coordForm.p2WorkloadW ?? 520);
                        const p2WlSize = Number(coordForm.p2WorkloadSize ?? 14);
                        const p2WlX = Number(coordForm.p2WorkloadX ?? Math.round((PDF_WIDTH - p2WlW) / 2));
                        const p2WlY = Number(coordForm.p2WorkloadY ?? 80);
                        return renderDraggable(
                            sub,
                            'p2WorkloadX',
                            'p2WorkloadY',
                            p2WlX,
                            p2WlY,
                            p2WlSize,
                            false,
                            false,
                            false,
                            'left',
                            {
                                richChildren: <>{renderMarkdownBoldSegments(sub)}</>,
                                verticalAnchor: 'pdfBaselineTop',
                                wrap: true,
                                maxWidthPx: p2WlW * scale,
                            },
                        );
                    })()}
                    {syllabusBlocks.flatMap((block, i) => {
                        const baseY = Number(coordForm['syllabusY'] ?? 510);
                        const lineHeight = Number(coordForm['syllabusTextSize'] ?? 10) * 1.8;
                        const defaultBlockY = Math.round(baseY - i * lineHeight * 3);
                        const blockYKey = `syllabusBlock${i}Y`;
                        const blockSizeKey = `syllabusBlock${i}Size`;
                        const blockY = Number(coordForm[blockYKey] ?? defaultBlockY);
                        const globalSylSize = Number(coordForm.syllabusTextSize ?? 10);
                        const textSize = Number(coordForm[blockSizeKey] ?? globalSylSize);

                        const previewTitle = block.titulos.split('\n')[0]?.trim() || null;
                        const previewWorkload = block.cargas.split('\n')[0]?.trim() || null;
                        const previewDesc = block.descricoes.split('\n')[0]?.trim() || null;

                        if (!previewTitle && !previewWorkload && !previewDesc) return [];

                        const items = [];
                        if (previewTitle) items.push(
                            <DraggableGhostItem
                                key={`syl-b${i}-col1`}
                                content={previewTitle}
                                keyX="syllabusCol1X"
                                keyY={blockYKey}
                                px={Number(coordForm['syllabusCol1X'] ?? 40)}
                                py={blockY}
                                fontSize={textSize}
                                isBold={false}
                                scale={scale}
                                lockX={false} lockY={false} anchor="left"
                                pdfToScreenCoords={pdfToScreenCoords}
                                screenToPdfCoords={screenToPdfCoords}
                                handleDragStop={handleDragStop}
                            />
                        );
                        if (previewWorkload) items.push(
                            <DraggableGhostItem
                                key={`syl-b${i}-col2`}
                                content={previewWorkload}
                                keyX="syllabusCol2X"
                                keyY={blockYKey}
                                px={Number(coordForm['syllabusCol2X'] ?? 290)}
                                py={blockY}
                                fontSize={textSize}
                                isBold={true}
                                scale={scale}
                                lockX={false} lockY={false} anchor="left"
                                pdfToScreenCoords={pdfToScreenCoords}
                                screenToPdfCoords={screenToPdfCoords}
                                handleDragStop={handleDragStop}
                            />
                        );
                        if (previewDesc) items.push(
                            <DraggableGhostItem
                                key={`syl-b${i}-col3`}
                                content={previewDesc}
                                keyX="syllabusCol3X"
                                keyY={blockYKey}
                                px={Number(coordForm['syllabusCol3X'] ?? 350)}
                                py={blockY}
                                fontSize={textSize}
                                isBold={false}
                                scale={scale}
                                lockX={false} lockY={false} anchor="left"
                                pdfToScreenCoords={pdfToScreenCoords}
                                screenToPdfCoords={screenToPdfCoords}
                                handleDragStop={handleDragStop}
                            />
                        );
                        return items;
                    })}




                    {/* Ghost do QR na Pág. 2 — só aparece quando showQrGhostP2=true */}
                    {showQrGhostP2 && (
                        <QrGhostItem
                            qrSize={Number(coordForm['p2QrSize'] ?? 64)}
                            qrX={Number(coordForm['p2QrX'] ?? 40)}
                            qrY={Number(coordForm['p2QrY'] ?? 40)}
                            scale={scale}
                            pdfToScreenCoords={pdfToScreenCoords}
                            screenToPdfCoords={screenToPdfCoords}
                            onDragStop={(x: number, y: number) =>
                                setCoordForm((prev: any) => ({ ...prev, p2QrX: String(x), p2QrY: String(y) }))
                            }
                        />
                    )}
                </>
            )}
        </div>
    );
}

/** Componente de nível de módulo para o ghost do QR Code (regras dos hooks do React) */
function QrGhostItem({
    qrSize, qrX, qrY, scale, pdfToScreenCoords, screenToPdfCoords, onDragStop
}: {
    qrSize: number; qrX: number; qrY: number; scale: number;
    pdfToScreenCoords: (x: number, y: number) => { x: number; y: number };
    screenToPdfCoords: (x: number, y: number) => { x: number; y: number };
    onDragStop: (x: number, y: number) => void;
}) {
    // No pdf-lib: (qrX, qrY) = canto INFERIOR-esquerdo do QR.
    // pdfToScreenCoords já converte para screen (origin top-left).
    // Mas o screen Y do pdf-lib aponta para o TOPO do elemento (invertido),
    // já que pdf-lib desenha de baixo para cima.
    // Portanto: pos.y = posição do TOPO do QR na tela (canto inferior PDF = canto superior tela - height).
    // Não precisamos de transform adicional — apenas posicionamos o div no pos retornado.
    const screenSize = Math.round(qrSize * scale);
    const [isHovered, setIsHovered] = useState(false);
    const [draggingCoords, setDraggingCoords] = useState<{ x: number; y: number } | null>(null);
    const displayX = draggingCoords ? draggingCoords.x : qrX;
    const displayY = draggingCoords ? draggingCoords.y : qrY;

    // Calcula posição na tela: Y do PDF é baseline inferior, já convertemos para top
    const rawPos = pdfToScreenCoords(qrX, qrY);
    // O topo do QR na tela = rawPos.y - screenSize (porque pdfToScreenCoords retorna o Y do ponto inferior do elemento)
    const screenTop = rawPos.y - screenSize;
    const screenLeft = rawPos.x;

    return (
        <Draggable
            position={{ x: screenLeft, y: screenTop }}
            onDrag={(_e, data) => {
                // data.x/y = posição do canto top-left na tela
                // Convertemos o canto INFERIOR-esquerdo (top + height) para PDF
                const c = screenToPdfCoords(data.x, data.y + screenSize);
                setDraggingCoords({ x: c.x, y: c.y });
            }}
            onStop={(_e, data) => {
                setDraggingCoords(null);
                const c = screenToPdfCoords(data.x, data.y + screenSize);
                onDragStop(c.x, c.y);
            }}
            bounds="parent"
        >
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    position: 'absolute', top: 0, left: 0,
                    width: screenSize, height: screenSize,
                    cursor: draggingCoords ? 'grabbing' : 'move',
                    userSelect: 'none',
                    pointerEvents: 'auto',
                    zIndex: isHovered ? 30 : 20,
                    border: isHovered || draggingCoords ? '2px dashed #06B6D4' : '1px dashed rgba(6,182,212,0.5)',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {/* QR real (SVG) para fidelidade visual máxima com o PDF */}
                <QRCodeSVG
                    value="https://qualifica.upgrade.com.br/verificar/PREVIEW"
                    size={screenSize}
                    bgColor="#ffffff"
                    fgColor="#111111"
                    level="M"
                    style={{ display: 'block', pointerEvents: 'none' }}
                />
                {(isHovered || draggingCoords) && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        fontSize: '0.5rem', color: '#06B6D4', background: 'rgba(255,255,255,0.85)',
                        padding: '1px 3px', borderRadius: 2, border: '1px solid #06B6D4',
                        whiteSpace: 'nowrap', pointerEvents: 'none'
                    }}>
                        X:{displayX} Y:{displayY} · {qrSize}pt
                    </div>
                )}
            </div>
        </Draggable>
    );
}

function DraggableGhostItem({
    content,
    richContent,
    keyX,
    keyY,
    px,
    py,
    fontSize,
    isBold,
    scale,
    lockX,
    lockY,
    anchor,
    wrap,
    maxWidthPx,
    verticalAnchor = 'legacyBottom',
    pdfToScreenCoords,
    screenToPdfCoords,
    handleDragStop,
}: {
    content: string;
    richContent?: ReactNode;
    keyX: string;
    keyY: string;
    px: number;
    py: number;
    fontSize: number;
    isBold: boolean;
    scale: number;
    lockX?: boolean;
    lockY?: boolean;
    anchor?: string;
    wrap?: boolean;
    maxWidthPx?: number;
    verticalAnchor?: 'pdfBaselineTop' | 'legacyBottom';
    pdfToScreenCoords: (x: number, y: number) => { x: number; y: number };
    screenToPdfCoords: (x: number, y: number) => { x: number; y: number };
    handleDragStop: (keyX: string, keyY: string, d: { x: number; y: number }) => void;
}) {
    const pdfYForScreen =
        verticalAnchor === 'pdfBaselineTop' ? pdfBaselineToTopY(py, fontSize) : py;
    const pos = pdfToScreenCoords(px, pdfYForScreen);
    const [isHovered, setIsHovered] = useState(false);
    const [draggingCoords, setDraggingCoords] = useState<{ x: number; y: number } | null>(null);

    const displayX = draggingCoords ? draggingCoords.x : px;
    const displayY = draggingCoords ? draggingCoords.y : py;
    const scaledFontSize = fontSize * scale;
    const body = richContent ?? content;

    const innerTransform =
        verticalAnchor === 'pdfBaselineTop'
            ? anchor === 'center'
                ? 'translate(-50%, 0)'
                : 'none'
            : anchor === 'center'
                ? 'translate(-50%, -100%)'
                : 'translate(0, -100%)';

    return (
        <Draggable
            position={{ x: pos.x, y: pos.y }}
            onDrag={(e, data) => {
                const topPdf = screenToPdfCoords(data.x, data.y);
                if (verticalAnchor === 'pdfBaselineTop') {
                    setDraggingCoords({
                        x: topPdf.x,
                        y: pdfTopToBaselineY(topPdf.y, fontSize),
                    });
                } else {
                    setDraggingCoords({ x: topPdf.x, y: topPdf.y });
                }
            }}
            onStop={(e, data) => {
                setDraggingCoords(null);
                if (verticalAnchor === 'pdfBaselineTop') {
                    const topPdf = screenToPdfCoords(data.x, data.y);
                    const baselinePdf = pdfTopToBaselineY(topPdf.y, fontSize);
                    handleDragStop(
                        keyX,
                        keyY,
                        {
                            x: data.x,
                            y: data.y,
                            __pdfX: topPdf.x,
                            __pdfBaselineY: baselinePdf,
                        } as any,
                    );
                } else {
                    handleDragStop(keyX, keyY, data);
                }
            }}
            bounds="parent"
            axis={lockX ? 'y' : lockY ? 'x' : 'both'}
        >
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
                <div
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        padding: '2px 4px',
                        background: 'transparent',
                        border: isHovered || draggingCoords ? '1px dashed #06B6D4' : '1px solid transparent',
                        cursor: draggingCoords ? 'grabbing' : 'move',
                        userSelect: 'none',
                        fontSize: `${scaledFontSize}px`,
                        color: '#020617',
                        fontWeight: isBold ? 800 : 400,
                        opacity: 1,
                        transform: innerTransform,
                        zIndex: isHovered ? 30 : 20,
                        whiteSpace: wrap ? 'normal' : 'nowrap',
                        wordBreak: wrap ? 'break-word' : 'normal',
                        overflowWrap: wrap ? 'break-word' : 'normal',
                        maxWidth: wrap && maxWidthPx ? maxWidthPx : undefined,
                        lineHeight: wrap ? 1.5 : undefined,
                        pointerEvents: 'auto',
                    }}
                >
                    {body}
                    {(isHovered || draggingCoords) && (
                        <div style={{ position: 'absolute', top: '-1.2rem', left: 0, fontSize: '0.6rem', color: '#06B6D4', background: '#fff', padding: '0 4px', borderRadius: 2, border: '1px solid #06B6D4', whiteSpace: 'nowrap' }}>
                            X: {Math.round(displayX)}, Y: {Math.round(displayY)}
                            {verticalAnchor === 'pdfBaselineTop' ? ' (baseline PDF)' : ''}
                        </div>
                    )}
                </div>
            </div>
        </Draggable>
    );
}

export default function CertificadosPage() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const [tab, setTab] = useState<'issued' | 'eligible' | 'templates'>('eligible');
    const [eligibleViewMode, setEligibleViewMode] = usePersistedAdminViewMode('admin:certificados:eligible', 'card');
    const [issuedViewMode, setIssuedViewMode] = usePersistedAdminViewMode('admin:certificados:issued', 'table');
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [eligible, setEligible] = useState<EligibleStudent[]>([]);
    const [issuedPage, setIssuedPage] = useState(1);
    const [eligiblePage, setEligiblePage] = useState(1);
    const [issuedTotal, setIssuedTotal] = useState(0);
    const [eligibleTotal, setEligibleTotal] = useState(0);
    const [issuedTotalPages, setIssuedTotalPages] = useState(1);
    const [eligibleTotalPages, setEligibleTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Certificate | null>(null);
    const [issuing, setIssuing] = useState<string | null>(null);
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [availablePdfs, setAvailablePdfs] = useState<AvailablePdfOption[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templateScope, setTemplateScope] = useState<'GLOBAL' | 'COURSE' | 'STATE' | 'COURSE_STATE' | 'PUBLIC_FILE'>('COURSE_STATE');
    const [templateState, setTemplateState] = useState('MA');
    const [templateType, setTemplateType] = useState<'PDF_BASE' | 'HTML'>('PDF_BASE');
    const [templateCourseId, setTemplateCourseId] = useState<string>('');
    const [previewPage, setPreviewPage] = useState<1 | 2>(1);
    const [templateTitle, setTemplateTitle] = useState('Modelo certificado');
    const [templatePdfPath, setTemplatePdfPath] = useState('');
    const [templateMessage, setTemplateMessage] = useState<string | null>(null);
    const [uploadingTemplateBase, setUploadingTemplateBase] = useState(false);
    const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<CertificateTemplate | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
    const [demoCertInfo, setDemoCertInfo] = useState<string | null>(null);
    const [pdfParagraphTemplate, setPdfParagraphTemplate] = useState('');
    const [pdfDateTemplate, setPdfDateTemplate] = useState('');
    const [pdfPage2WorkloadTemplate, setPdfPage2WorkloadTemplate] = useState('');
    const [pdfSyllabusTitleContent, setPdfSyllabusTitleContent] = useState('');
    const [pdfSyllabusWorkloadContent, setPdfSyllabusWorkloadContent] = useState('');
    const [pdfSyllabusDescContent, setPdfSyllabusDescContent] = useState('');
    /** Blocos estruturados do conteúdo programático (UI). Serializados com §§§ no payload. */
    const [syllabusBlocks, setSyllabusBlocks] = useState<SyllabusBlock[]>([
        { id: '0', titulos: '', cargas: '', descricoes: '' }
    ]);
    /** Controle de em qual página o QR Code é exibido */
    const [qrPages, setQrPages] = useState<{ page1: boolean; page2: boolean }>({ page1: true, page2: false });
    /** Legado: retângulo branco cobria o parágrafo (desfigurava o fundo do modelo). Por defeito desligado. */
    const [pdfUseBodyWhiteMask, setPdfUseBodyWhiteMask] = useState(false);
    const [pdfUseP2TitleWhiteMask, setPdfUseP2TitleWhiteMask] = useState(false);
    // Por padrão false: novos modelos começam limpos (sem ghost do nome)
    const [pdfDrawHeader, setPdfDrawHeader] = useState(false);
    const [pdfSignatureMode, setPdfSignatureMode] = useState<'AUTO' | 'IMAGE' | 'PADES' | 'BOTH' | 'NONE'>('AUTO');
    const [pdfSignatureImagePath, setPdfSignatureImagePath] = useState('');
    const [templateModelTab, setTemplateModelTab] = useState<'conteudo' | 'coordenadas'>('conteudo');
    const [coordForm, setCoordForm] = useState<Record<string, string>>({});
    const [debouncedCoordForm, setDebouncedCoordForm] = useState<Record<string, string>>({});
    const [autoCoordDebugPreview, setAutoCoordDebugPreview] = useState(false);
    const [debugPreviewUrl, setDebugPreviewUrl] = useState<string | null>(null);
    const [debugPreviewLoading, setDebugPreviewLoading] = useState(false);
    const [previewTestKey, setPreviewTestKey] = useState<string>('');
    const lastDebugUrl = useRef<string | null>(null);
    const [previewing, setPreviewing] = useState<string | null>(null);
    // Modal "Ver PDF Real"
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfModalUrl, setPdfModalUrl] = useState<string | null>(null);
    const [pdfModalLoading, setPdfModalLoading] = useState(false);
    const lastModalPdfUrl = useRef<string | null>(null);
    // MEL-08: Modais de Duplicar e Vincular (substituem window.prompt e select inline)
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateTitleInput, setDuplicateTitleInput] = useState('');
    const [duplicatingModal, setDuplicatingModal] = useState(false);
    const [showVinculoCursoModal, setShowVinculoCursoModal] = useState(false);
    const [vinculoCursoInput, setVinculoCursoInput] = useState('');
    const [autoFillLoading, setAutoFillLoading] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [seedingTemplates, setSeedingTemplates] = useState(false);

    // URL base da API para links de download direto
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3012/api').replace(/\/api$/, '/api');

    const lastPdfObjectUrl = useRef<string | null>(null);
    useEffect(
        () => () => {
            if (lastPdfObjectUrl.current) {
                URL.revokeObjectURL(lastPdfObjectUrl.current);
                lastPdfObjectUrl.current = null;
            }
        },
        [],
    );

    useEffect(() => { fetchData(); fetchTemplates(); fetchCourses(); fetchAvailablePdfs(); }, []);

    useEffect(() => {
        const u = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (!u) return;
        try {
            setUserRole(JSON.parse(u).role || '');
        } catch {
            setUserRole('');
        }
    }, []);

    const isAdmin = userRole === 'ADMIN' || userRole === 'IT_ADMIN';

    useEffect(() => {
        if (tab !== 'issued') return;
        setLoading(true);
        fetchIssued(issuedPage).finally(() => setLoading(false));
    }, [issuedPage, tab]);

    useEffect(() => {
        if (tab !== 'eligible') return;
        setLoading(true);
        fetchEligible(eligiblePage).finally(() => setLoading(false));
    }, [eligiblePage, tab]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedCoordForm(coordForm), 500);
        return () => clearTimeout(t);
    }, [coordForm]);

    useEffect(() => {
        if (eligible.length > 0 && !previewTestKey) {
            const s = eligible[0];
            setPreviewTestKey(`${s.id}:${s.classId}`);
        }
    }, [eligible, previewTestKey]);

    /** Alinha pré-visualização ao vivo ao PDF: curso seleccionado no modelo + aluno de teste da lista elegível. */
    const pdfLivePreviewSample = useMemo((): PdfLivePreviewSample => {
        const [sid] = previewTestKey.split(':');
        const student = sid ? eligible.find(e => e.id === sid) : undefined;
        const course = templateCourseId ? courses.find(c => c.id === templateCourseId) : undefined;
        const issuedAtDisplay = new Date().toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const uf = templateState.trim().toUpperCase() || 'MA';
        const cityName = uf === 'PI' ? 'Teresina' : 'São Luís';
        return {
            studentName: student?.name ?? 'Aluno',
            courseName: course?.name ?? student?.courseName ?? 'Curso',
            workload: course?.workloadHours ?? 40,
            cityName,
            uf,
            issuedAtDisplay,
        };
    }, [previewTestKey, eligible, courses, templateCourseId, templateState]);

    useEffect(() => {
        if (templateType !== 'PDF_BASE') {
            setTemplateType('PDF_BASE');
        }
    }, [templateType]);

    // Debounce for text-override fields (500ms)
    const [debouncedTextOverrides, setDebouncedTextOverrides] = useState({
        pdfParagraphTemplate, pdfDateTemplate, pdfPage2WorkloadTemplate,
        pdfSyllabusTitleContent, pdfSyllabusWorkloadContent, pdfSyllabusDescContent,
        pdfUseBodyWhiteMask, pdfUseP2TitleWhiteMask, pdfDrawHeader,
        pdfSignatureMode, pdfSignatureImagePath,
    });
    useEffect(() => {
        const t = setTimeout(() => setDebouncedTextOverrides({
            pdfParagraphTemplate, pdfDateTemplate, pdfPage2WorkloadTemplate,
            pdfSyllabusTitleContent, pdfSyllabusWorkloadContent, pdfSyllabusDescContent,
            pdfUseBodyWhiteMask, pdfUseP2TitleWhiteMask, pdfDrawHeader,
            pdfSignatureMode, pdfSignatureImagePath,
        }), 400);
        return () => clearTimeout(t);
    }, [pdfParagraphTemplate, pdfDateTemplate, pdfPage2WorkloadTemplate, pdfSyllabusTitleContent, pdfSyllabusWorkloadContent, pdfSyllabusDescContent, pdfUseBodyWhiteMask, pdfUseP2TitleWhiteMask, pdfDrawHeader, pdfSignatureMode, pdfSignatureImagePath]);

    const availableUfOptions = useMemo(() => {
        const set = new Set<string>(['MA', 'PI']);
        templates.forEach((tpl) => {
            const uf = String(tpl.state || '').trim().toUpperCase();
            if (/^[A-Z]{2}$/.test(uf)) set.add(uf);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [templates]);

    useEffect(
        () => () => {
            if (lastDebugUrl.current) {
                URL.revokeObjectURL(lastDebugUrl.current);
                lastDebugUrl.current = null;
            }
        },
        [],
    );

    const fetchIssued = async (page = issuedPage) => {
        try {
            const certRes = await api.get('/certificates', { params: { page, limit: ADMIN_PAGE_SIZE_TABLE } });
            const norm = normalizePaginated<Certificate>(certRes.data, ADMIN_PAGE_SIZE_TABLE);
            setCertificates(norm.data);
            setIssuedTotal(norm.total);
            setIssuedTotalPages(norm.totalPages);
        } catch {
            setCertificates([]);
            setIssuedTotal(0);
            setIssuedTotalPages(1);
        }
    };

    const fetchEligible = async (page = eligiblePage) => {
        try {
            const eligRes = await api.get('/certificates/eligible', { params: { page, limit: ADMIN_PAGE_SIZE_TABLE } });
            const norm = normalizePaginated<EligibleStudent>(eligRes.data, ADMIN_PAGE_SIZE_TABLE);
            if (norm.data.length > 0) {
                setEligible(norm.data);
                setEligibleTotal(norm.total);
                setEligibleTotalPages(norm.totalPages);
            } else if (page === 1) {
                setEligible([
                    { id: '1', name: 'Ana Silva', cpf: '123.456.789-01', enrollmentId: 'enr1', classId: 'cls1', courseName: 'Informática Básica', classIdentifier: 'INF-001/MA', attendanceRate: 92 },
                    { id: '2', name: 'Carlos Sousa', cpf: '987.654.321-00', enrollmentId: 'enr2', classId: 'cls1', courseName: 'Informática Básica', classIdentifier: 'INF-001/MA', attendanceRate: 88 },
                    { id: '3', name: 'Maria Oliveira', cpf: '111.222.333-44', enrollmentId: 'enr3', classId: 'cls2', courseName: 'Costura Industrial', classIdentifier: 'COS-002/PI', attendanceRate: 81 },
                ]);
                setEligibleTotal(3);
                setEligibleTotalPages(1);
            } else {
                setEligible([]);
                setEligibleTotal(0);
                setEligibleTotalPages(1);
            }
        } catch {
            setEligible([]);
            setEligibleTotal(0);
            setEligibleTotalPages(1);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchIssued(issuedPage), fetchEligible(eligiblePage)]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/certificates/templates');
            setTemplates(Array.isArray(res.data) ? res.data : []);
        } catch {
            setTemplates([]);
        }
    };

    const deleteTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!await customConfirm({
            title: 'Apagar modelo?',
            message: 'Tem a certeza que deseja apagar este modelo e todas as suas versões? Esta acção não pode ser desfeita.',
            danger: true,
            confirmLabel: 'Apagar',
            cancelLabel: 'Cancelar',
        })) return;
        try {
            await api.delete(`/certificates/templates/${templateId}`);
            await customAlert({
                title: 'Modelo apagado',
                message: 'O modelo e todas as suas versões foram removidos com sucesso.',
                variant: 'success',
            });
            fetchTemplates();
            if (selectedTemplateId === templateId) {
                createPdfBaseTemplateFromDocumentModel();
            }
        } catch (error: any) {
            await customAlert({
                title: 'Erro ao apagar modelo',
                message: error.response?.data?.message || error.message,
                variant: 'danger',
            });
        }
    };

    const applyVersionToEditor = (version: CertificateTemplateVersion) => {
        setTemplateTitle(version.title || 'Modelo certificado');
        setTemplateType(version.templateType === 'HTML' ? 'HTML' : 'PDF_BASE');
        setTemplatePdfPath(version.pdfPath || '');
        const po = version.pdfTextOverrides;
        if (po && typeof po === 'object') {
            setPdfParagraphTemplate(typeof po.paragraphTemplate === 'string' ? po.paragraphTemplate : '');
            setPdfDateTemplate(typeof po.dateTemplate === 'string' ? po.dateTemplate : '');
            setPdfPage2WorkloadTemplate(typeof po.page2WorkloadTemplate === 'string' ? po.page2WorkloadTemplate : '');
            const rawTitle = typeof po.syllabusTitleContent === 'string' ? po.syllabusTitleContent : '';
            const rawWorkload = typeof po.syllabusWorkloadContent === 'string' ? po.syllabusWorkloadContent : '';
            const rawDesc = typeof po.syllabusDescContent === 'string' ? po.syllabusDescContent : '';
            setPdfSyllabusTitleContent(rawTitle);
            setPdfSyllabusWorkloadContent(rawWorkload);
            setPdfSyllabusDescContent(rawDesc);
            setSyllabusBlocks(deserializeSyllabusBlocks(rawTitle, rawWorkload, rawDesc));
            setQrPages({
                page1: po.qrPage1 !== false,
                page2: po.qrPage2 === true,
            });
            setPdfUseBodyWhiteMask(po.useBodyWhiteMask === true);
            setPdfUseP2TitleWhiteMask(po.usePage2TitleWhiteMask === true);
            setPdfDrawHeader(po.drawHeaderNameAndDetails === true);
            setPdfSignatureMode(
                po.signatureMode === 'IMAGE' || po.signatureMode === 'PADES' || po.signatureMode === 'BOTH' || po.signatureMode === 'NONE'
                    ? po.signatureMode
                    : 'AUTO',
            );
            setPdfSignatureImagePath(typeof po.signatureImagePath === 'string' ? po.signatureImagePath : '');
        } else {
            setPdfParagraphTemplate('');
            setPdfDateTemplate('');
            setPdfPage2WorkloadTemplate('');
            setPdfSyllabusTitleContent('');
            setPdfSyllabusWorkloadContent('');
            setPdfSyllabusDescContent('');
            setSyllabusBlocks([{ id: '0', titulos: '', cargas: '', descricoes: '' }]);
            setQrPages({ page1: true, page2: false });
            setPdfUseBodyWhiteMask(false);
            setPdfUseP2TitleWhiteMask(false);
            setPdfDrawHeader(false);
            setPdfSignatureMode('AUTO');
            setPdfSignatureImagePath('');
        }
        const nextCoords = coordinateOverridesToForm(version.coordinateOverrides);
        setCoordForm(nextCoords);
        setDebouncedCoordForm(nextCoords);
    };

    const loadTemplateDetail = async (templateId: string, versionIdToApply?: string) => {
        try {
            const res = await api.get(`/certificates/templates/${templateId}`);
            const tpl: CertificateTemplate = res.data;
            setSelectedTemplateId(templateId);

            let versionToApply: CertificateTemplateVersion | null | undefined = tpl.currentVersion;
            if (versionIdToApply && tpl.versions?.length) {
                versionToApply = tpl.versions.find((v) => v.id === versionIdToApply) ?? versionToApply;
            }

            setSelectedTemplateDetail(
                versionToApply
                    ? { ...tpl, currentVersion: versionToApply }
                    : tpl,
            );

            if (versionToApply) {
                applyVersionToEditor(versionToApply);
            }
            setTemplateScope(tpl.scope);
            if (tpl.state) setTemplateState(String(tpl.state).trim().toUpperCase());
            setTemplateCourseId(tpl.courseId || '');
        } catch {
            setTemplateMessage('Não foi possível carregar o modelo selecionado.');
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses', { params: { page: 1, limit: 500, active: true } });
            const rows = unwrapListData<{ id: string; name: string; workloadHours?: number }>(res.data);
            setCourses(
                rows
                    .map((c) => ({
                        id: c.id,
                        name: c.name,
                        workloadHours: typeof c.workloadHours === 'number' ? c.workloadHours : undefined,
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
            );
        } catch {
            setCourses([]);
            toast.error('Não foi possível carregar a lista de cursos.');
        }
    };

    async function fetchAvailablePdfs() {
        try {
            const res = await api.get('/certificates/admin/available-bases');
            setAvailablePdfs(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAvailablePdfs([]);
        }
    }

    const uploadTemplateBase = async (file?: File) => {
        if (!file) return;
        const valid = /\.(pdf|png|jpe?g)$/i.test(file.name);
        if (!valid) {
            setTemplateMessage('Formato inválido. Envie PDF, PNG ou JPG/JPEG.');
            return;
        }
        setUploadingTemplateBase(true);
        setTemplateMessage(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/certificates/templates/upload-base', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const uploadedPath = res.data?.path ? String(res.data.path) : '';
            if (uploadedPath) {
                setTemplatePdfPath(uploadedPath);
                await fetchAvailablePdfs();
                setTemplateMessage('Template base enviado com sucesso. O arquivo já foi selecionado no editor.');
            } else {
                setTemplateMessage('Upload concluído, mas sem caminho retornado pelo servidor.');
            }
        } catch (error: any) {
            setTemplateMessage(error?.response?.data?.message || 'Falha ao enviar template base.');
        } finally {
            setUploadingTemplateBase(false);
        }
    };

    const importTemplatesFromPublic = async () => {
        setTemplateMessage('Importação legada desativada. Use apenas Moldes Mestres (MA/PI), upload de base e editor.');
    };

    const ensureDemoCertificate = async () => {
        setDemoCertInfo(null);
        try {
            const res = await api.post('/certificates/admin/ensure-demo-certificate');
            const c = res.data?.certificate;
            setDemoCertInfo(
                (res.data?.message || '') + (c?.verificationCode ? ` Código: ${c.verificationCode}.` : ''),
            );
            await fetchData();
        } catch (e: any) {
            setDemoCertInfo(e?.response?.data?.message || 'Falha ao garantir certificado de teste.');
        }
    };

    const purgeIssuedCertificates = async () => {
        if (!await customConfirm({
            title: 'Apagar certificados emitidos?',
            message: 'Apaga TODOS os certificados emitidos e os convites de feedback associados. Esta acção é destrutiva e não pode ser desfeita.',
            danger: true,
            confirmLabel: 'Apagar tudo',
            cancelLabel: 'Cancelar',
        })) return;
        setTemplateMessage(null);
        try {
            const res = await api.post('/certificates/admin/purge-issued-certificates');
            setTemplateMessage(`Foram removidos ${res.data?.deleted ?? 0} certificado(s). Pode emitir de novo na aba Elegíveis.`);
            await fetchData();
        } catch (e: any) {
            setTemplateMessage(e?.response?.data?.message || 'Falha ao apagar certificados (só admin).');
        }
    };

    const backfillCertificateTemplateVersions = async () => {
        setTemplateMessage(null);
        try {
            const res = await api.post('/certificates/admin/backfill-certificate-template-versions');
            const n = res.data?.updated ?? 0;
            const s = res.data?.scanned ?? 0;
            setTemplateMessage(`Backfill: ${n} de ${s} certificado(s) com versão de modelo atribuída.`);
            await fetchData();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setTemplateMessage(err?.response?.data?.message || 'Falha no backfill (permissão admin).');
        }
    };

    const syncCertificateToPublishedTemplate = async (certificateId: string) => {
        setTemplateMessage(null);
        try {
            await api.patch(`/certificates/${certificateId}/sync-template`);
            setTemplateMessage('Modelo alinhado à versão publicada. O PDF passa a usar a nova base.');
            await fetchData();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setTemplateMessage(err?.response?.data?.message || 'Não foi possível sincronizar o modelo (admin/coordenador).');
        }
    };

    const seedMasterTemplates = async () => {
        setSeedingTemplates(true);
        setTemplateMessage(null);
        try {
            const res = await api.post('/certificates/admin/seed-master-templates');
            const results = res.data?.results as { state: string; status: string }[] ?? [];
            const summary = results.map(r => `${r.state}: ${r.status}`).join(' · ');
            toast.success(`✅ Moldes Mestres MA/PI recriados! ${summary}`);
            setTemplateMessage(`✅ Moldes Mestres activados! ${summary}. Templates MA e PI oficiais recriados com coordenadas padrão.`);
            await fetchTemplates();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            const msg = err?.response?.data?.message || 'Falha ao activar moldes mestres (permissão admin).';
            toast.error(msg);
            setTemplateMessage(msg);
        } finally {
            setSeedingTemplates(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────
    // Os presets MA/PI hardcoded foram removidos (eram fonte de bug visual).
    // Para configurar modelos por UF, use o botão "Recriar Moldes Mestres"
    // abaixo dos cards de modelo — ele lê fundo-limpo.png + coordenadas calibradas
    // do backend (seedMasterTemplates) e cria/atualiza os 2 templates oficiais.
    // ─────────────────────────────────────────────────────────────────
    const applyPreset = (_uf: 'MA' | 'PI') => {
        // No-op deliberado: presets foram removidos. Mantido como stub
        // para evitar quebras caso algum botão antigo ainda referencie a função.
    };

    /** Abre modal com PDF real gerado pelo backend */
    const openRealPdfModal = async () => {
        const [studentId, classId] = previewTestKey.split(':');
        if (!studentId || !classId) {
            await customAlert({
                title: 'Aluno não selecionado',
                message: 'Selecione um aluno de teste primeiro na aba "Elegíveis".',
                variant: 'warning',
            });
            return;
        }
        const versionId = selectedTemplateDetail?.currentVersion?.id;
        if (!versionId && !templatePdfPath) {
            await customAlert({
                title: 'Modelo não configurado',
                message: 'Selecione um modelo ou ficheiro de fundo (PDF/imagem) primeiro.',
                variant: 'warning',
            });
            return;
        }
        setPdfModalOpen(true);
        setPdfModalLoading(true);
        setPdfModalUrl(null);
        try {
            const coordinateOverrides = parseCoordFormToPayload(debouncedCoordForm);
            const payload: Record<string, unknown> = {
                studentId, classId,
                debug: false,
                isVisualEditor: false,
                pdfTextOverrides: buildLivePdfTextOverridesPayload(),
                ...(coordinateOverrides ? { coordinateOverrides } : {}),
                ...(templateCourseId ? { previewCourseId: templateCourseId } : {}),
            };
            if (versionId) payload.templateVersionId = versionId;
            if (templatePdfPath) payload.pdfPathOverride = templatePdfPath;
            const res = await api.post('/certificates/admin/preview-certificate-pdf', payload, { responseType: 'blob' });
            if (lastModalPdfUrl.current) URL.revokeObjectURL(lastModalPdfUrl.current);
            const u = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            lastModalPdfUrl.current = u;
            setPdfModalUrl(u);
        } catch {
            await customAlert({
                title: 'Falha ao gerar PDF',
                message: 'Verifique se o modelo está configurado e o aluno de teste é válido (frequência ≥ 75% para emitir).',
                variant: 'danger',
            });
            setPdfModalOpen(false);
        } finally {
            setPdfModalLoading(false);
        }
    };

    const buildPdfTextOverridesPayload = (): Record<string, string | boolean> | undefined => {
        if (templateType !== 'PDF_BASE') return undefined;
        const { syllabusTitleContent, syllabusWorkloadContent, syllabusDescContent } = serializeSyllabusBlocks(syllabusBlocks);
        const o: Record<string, string | boolean> = {
            paragraphTemplate: pdfParagraphTemplate,
            dateTemplate: pdfDateTemplate,
            page2WorkloadTemplate: pdfPage2WorkloadTemplate,
            syllabusTitleContent,
            syllabusWorkloadContent,
            syllabusDescContent,
            useBodyWhiteMask: pdfUseBodyWhiteMask,
            usePage2TitleWhiteMask: pdfUseP2TitleWhiteMask,
            drawHeaderNameAndDetails: pdfDrawHeader,
            signatureMode: pdfSignatureMode,
            qrPage1: qrPages.page1,
            qrPage2: qrPages.page2,
        };
        if (pdfSignatureImagePath.trim()) o.signatureImagePath = pdfSignatureImagePath.trim();
        return o;
    };

    const buildLivePdfTextOverridesPayload = (): Record<string, string | boolean> => {
        const { syllabusTitleContent, syllabusWorkloadContent, syllabusDescContent } = serializeSyllabusBlocks(syllabusBlocks);
        const o: Record<string, string | boolean> = {
            courseName: courses.find(c => c.id === templateCourseId)?.name || '',
            paragraphTemplate: pdfParagraphTemplate,
            dateTemplate: pdfDateTemplate,
            page2WorkloadTemplate: pdfPage2WorkloadTemplate,
            syllabusTitleContent,
            syllabusWorkloadContent,
            syllabusDescContent,
            useBodyWhiteMask: pdfUseBodyWhiteMask,
            usePage2TitleWhiteMask: pdfUseP2TitleWhiteMask,
            drawHeaderNameAndDetails: pdfDrawHeader,
            signatureMode: pdfSignatureMode,
            qrPage1: qrPages.page1,
            qrPage2: qrPages.page2,
        };
        if (pdfSignatureImagePath.trim()) o.signatureImagePath = pdfSignatureImagePath.trim();
        return o;
    };

    const buildCoordinateOverridesPayload = (): Record<string, number> | undefined => {
        if (templateType !== 'PDF_BASE') return undefined;
        const o: Record<string, number> = {};
        for (const { key } of COORDINATE_FIELD_KEYS) {
            const s = coordForm[key]?.trim();
            if (s === undefined || s === '') continue;
            const n = Number(s);
            if (Number.isFinite(n)) o[key] = n;
        }
        for (const key of Object.keys(coordForm)) {
            if (!isSyllabusBlockCoordKey(key)) continue;
            const s = coordForm[key]?.trim();
            if (s !== undefined && s !== '') {
                const n = Number(s);
                if (Number.isFinite(n)) o[key] = n;
            }
        }
        if (Object.keys(o).length > 0) return o;
        // Novo modelo PDF_BASE: inicia com defaults amigáveis.
        if (!selectedTemplateId) {
            const d: Record<string, number> = {};
            for (const [k, v] of Object.entries(DEFAULT_COORDINATE_OVERRIDES)) {
                const n = Number(v);
                if (Number.isFinite(n)) d[k] = n;
            }
            return d;
        }
        return undefined;
    };

    const parseCoordFormToPayload = (form: Record<string, string>): Record<string, number> | undefined => {
        const o: Record<string, number> = {};
        for (const { key } of COORDINATE_FIELD_KEYS) {
            const s = form[key]?.trim();
            if (s === undefined || s === '') continue;
            const n = Number(s);
            if (Number.isFinite(n)) o[key] = n;
        }
        for (const key of Object.keys(form)) {
            if (!isSyllabusBlockCoordKey(key)) continue;
            const s = form[key]?.trim();
            if (s !== undefined && s !== '') {
                const n = Number(s);
                if (Number.isFinite(n)) o[key] = n;
            }
        }
        return Object.keys(o).length > 0 ? o : undefined;
    };

    const runDebugCoordinatePreview = useCallback(async () => {
        const versionId = selectedTemplateDetail?.currentVersion?.id;
        if (!versionId || selectedTemplateDetail?.currentVersion?.templateType !== 'PDF_BASE') {
            return;
        }
        const [studentId, classId] = previewTestKey.split(':');
        if (!studentId || !classId) {
            setTemplateMessage('Não há matrícula de teste: abra a aba Elegíveis (aluno com ENROLLED) ou selecione abaixo.');
            return;
        }
        if (lastDebugUrl.current) {
            URL.revokeObjectURL(lastDebugUrl.current);
            lastDebugUrl.current = null;
        }
        setDebugPreviewLoading(true);
        setTemplateMessage(null);
        try {
            const coordinateOverrides = parseCoordFormToPayload(debouncedCoordForm);
            const res = await api.post(
                '/certificates/admin/preview-certificate-pdf',
                {
                    studentId,
                    classId,
                    templateVersionId: versionId,
                    debug: true,
                    ...(coordinateOverrides ? { coordinateOverrides } : {}),
                    pdfTextOverrides: buildLivePdfTextOverridesPayload(),
                    ...(templateCourseId ? { previewCourseId: templateCourseId } : {}),
                },
                { responseType: 'blob' },
            );
            const u = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            lastDebugUrl.current = u;
            setDebugPreviewUrl(u);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setTemplateMessage(err?.response?.data?.message || 'Falha no PDF de debug. Ver matrícula aprovada e ficheiro PDF do modelo.');
        } finally {
            setDebugPreviewLoading(false);
        }
    }, [
        selectedTemplateDetail?.currentVersion,
        previewTestKey,
        debouncedCoordForm,
        pdfParagraphTemplate,
        pdfUseBodyWhiteMask,
        pdfUseP2TitleWhiteMask,
        pdfDrawHeader,
        pdfSignatureMode,
        pdfSignatureImagePath,
    ]);

    // runPdfBasePreview and its POST request have been removed.
    // The visual editor now uses pure DOM (Image + CSS) without backend duplication.

    useEffect(() => {
        if (tab !== 'templates' || templateModelTab !== 'coordenadas' || !autoCoordDebugPreview) {
            return;
        }
        if (templateType !== 'PDF_BASE' || !selectedTemplateDetail?.currentVersion?.id) {
            return;
        }
        if (!previewTestKey.includes(':')) {
            return;
        }
        void runDebugCoordinatePreview();
    }, [
        tab,
        templateModelTab,
        autoCoordDebugPreview,
        debouncedCoordForm,
        templateType,
        selectedTemplateDetail?.currentVersion?.id,
        previewTestKey,
        runDebugCoordinatePreview,
    ]);

    // Removed debounced useEffect that called runPdfBasePreview.

    const validateTemplateForm = (): string | null => {
        const normalizedUf = templateState.trim().toUpperCase();
        if (!templateCourseId) {
            return 'Selecione um curso vinculado antes de salvar. O modelo precisa saber de qual curso puxar dados na emissão.';
        }
        if (
            (templateScope === 'STATE' || templateScope === 'COURSE_STATE')
            && !/^[A-Z]{2}$/.test(normalizedUf)
        ) {
            return 'Informe uma UF válida com 2 letras (ex.: MA, PI, AC).';
        }
        if (templateScope === 'COURSE_STATE' || templateScope === 'COURSE') {
            // ok
        } else if (templateScope === 'STATE') {
            // curso usado só para preview/ementa
        }
        return null;
    };

    const buildTemplatePayload = (autoPublish: boolean) => {
        const normalizedUf = templateState.trim().toUpperCase();
        return {
            scope: templateScope,
            courseId: templateScope === 'COURSE' || templateScope === 'COURSE_STATE'
                ? templateCourseId || undefined
                : undefined,
            state: templateScope === 'STATE' || templateScope === 'COURSE_STATE'
                ? normalizedUf
                : undefined,
            title: templateTitle,
            templateType,
            htmlContent: undefined,
            cssContent: undefined,
            pdfPath: templateType === 'PDF_BASE' ? templatePdfPath || undefined : undefined,
            pdfTextOverrides: buildPdfTextOverridesPayload(),
            coordinateOverrides: parseCoordFormToPayload(coordForm),
            keyOverride: selectedTemplateDetail?.scope === 'PUBLIC_FILE' ? selectedTemplateDetail.key : undefined,
            placeholders: ['ALUNO_NOME', 'CURSO_NOME', 'CARGA_HORARIA', 'CIDADE', 'ESTADO', 'DATA_EMISSAO', 'CODIGO_VERIFICACAO', 'QR_CODE_DATA_URL', 'TURMA', 'EMISSOR'],
            autoPublish,
        };
    };

    const persistTemplateVersion = async (autoPublish: boolean): Promise<{ templateId: string; version: number; status: string } | null> => {
        const validationError = validateTemplateForm();
        if (validationError) {
            setTemplateMessage(validationError);
            return null;
        }
        setSavingTemplate(true);
        setTemplateMessage(null);
        try {
            const res = await api.post('/certificates/templates', buildTemplatePayload(autoPublish));
            let savedVersion = res.data as CertificateTemplateVersion & { templateId?: string };
            const templateId = savedVersion?.templateId;
            const versionId = savedVersion?.id;

            if (versionId && savedVersion?.status !== 'PUBLISHED' && autoPublish && isAdmin) {
                await api.post(`/certificates/templates/versions/${versionId}/publish`);
                savedVersion = { ...savedVersion, status: 'PUBLISHED' };
            }

            if (templateId && savedVersion?.id) {
                setSelectedTemplateId(templateId);
                applyVersionToEditor(savedVersion);
                try {
                    const detailRes = await api.get(`/certificates/templates/${templateId}`);
                    const tpl: CertificateTemplate = detailRes.data;
                    setSelectedTemplateDetail({
                        ...tpl,
                        currentVersion: savedVersion,
                    });
                } catch {
                    setSelectedTemplateDetail((prev) =>
                        prev ? { ...prev, id: templateId, currentVersion: savedVersion } : prev,
                    );
                }
            }

            await fetchTemplates();

            return {
                templateId: templateId ?? '',
                version: savedVersion?.version ?? 0,
                status: savedVersion?.status ?? (autoPublish && isAdmin ? 'PUBLISHED' : 'DRAFT'),
            };
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const msg = err?.response?.data?.message || 'Erro ao salvar versão de modelo.';
            setTemplateMessage(Array.isArray(msg) ? msg.join(' | ') : msg);
            return null;
        } finally {
            setSavingTemplate(false);
        }
    };

    const saveModelToLibrary = async () => {
        const result = await persistTemplateVersion(false);
        if (result) {
            setTemplateMessage(`Salvo na biblioteca (rascunho v${result.version}). A emissão continua usando o modelo oficial até você publicar.`);
        }
    };

    const findConflictingOfficialTemplate = () => {
        const normalizedUf = templateState.trim().toUpperCase();
        return templates.find((t) => {
            if (t.currentVersion?.status !== 'PUBLISHED') return false;
            if (templateScope === 'COURSE_STATE') {
                return t.scope === 'COURSE_STATE' && t.courseId === templateCourseId && t.state === normalizedUf;
            }
            if (templateScope === 'COURSE') {
                return t.scope === 'COURSE' && t.courseId === templateCourseId;
            }
            return false;
        });
    };

    const makeModelOfficialForCourse = async () => {
        if (!isAdmin) {
            setTemplateMessage('Somente administrador pode tornar o modelo oficial na emissão.');
            return;
        }
        const validationError = validateTemplateForm();
        if (validationError) {
            setTemplateMessage(validationError);
            return;
        }
        if (templateScope !== 'COURSE' && templateScope !== 'COURSE_STATE') {
            setTemplateMessage('Para tornar oficial do curso, use o âmbito "Curso" ou "Curso + UF".');
            return;
        }
        const conflicting = findConflictingOfficialTemplate();
        if (conflicting && conflicting.id !== selectedTemplateId) {
            const courseName = courses.find((c) => c.id === templateCourseId)?.name || 'este curso';
            const ok = await customConfirm({
                title: 'Substituir modelo oficial?',
                message: `Já existe um modelo oficial publicado para ${courseName}${templateScope === 'COURSE_STATE' ? ` (${templateState})` : ''}. Ao continuar, a nova versão passará a ser usada na emissão.`,
                confirmLabel: 'Tornar oficial',
                variant: 'warning',
            });
            if (!ok) return;
        }
        const result = await persistTemplateVersion(true);
        if (result?.status === 'PUBLISHED') {
            setTemplateMessage(`Modelo oficial do curso atualizado (v${result.version} publicada na emissão).`);
        } else if (result) {
            setTemplateMessage(`Versão v${result.version} criada; verifique permissões de publicação.`);
        }
    };

    // MEL-08: abre modal de duplicação (substitui window.prompt nativo)
    const openDuplicateModal = () => {
        const templateId = selectedTemplateDetail?.id;
        if (!templateId) {
            setTemplateMessage('Selecione um modelo com versão atual para duplicar.');
            return;
        }
        setDuplicateTitleInput(`${selectedTemplateDetail?.currentVersion?.title || 'Modelo'} (cópia)`);
        setShowDuplicateModal(true);
    };

    const confirmDuplicate = async () => {
        const templateId = selectedTemplateDetail?.id;
        if (!templateId) return;
        setDuplicatingModal(true);
        setTemplateMessage(null);
        try {
            const res = await api.post(`/certificates/admin/templates/${templateId}/duplicate`, {
                title: duplicateTitleInput.trim() || undefined,
            });
            setTemplateMessage(`Modelo duplicado criado: ${res.data?.title ?? 'cópia'}`);
            setShowDuplicateModal(false);
            await fetchTemplates();
            if (res.data?.templateId) {
                await loadTemplateDetail(res.data.templateId);
            }
        } catch {
            setTemplateMessage('Não foi possível duplicar a versão.');
        } finally {
            setDuplicatingModal(false);
        }
    };

    // MEL-08: autopreenchimento dos blocos do syllabus a partir do curso
    const handleAutoFillFromCourse = async (courseId: string) => {
        if (!courseId) return;
        setAutoFillLoading(true);
        try {
            const res = await api.get(`/courses/${courseId}`);
            const course = res.data;
            // Preenche carga horária
            if (course?.workloadHours) {
                setPdfPage2WorkloadTemplate(`Carga Horária Total: ${course.workloadHours}h`);
            }
            // Preenche blocos do syllabus a partir dos módulos do curso
            const mods: any[] = Array.isArray(course?.modules) ? course.modules : [];
            if (mods.length > 0) {
                const newBlocks: SyllabusBlock[] = mods.map((m: any, idx: number) => ({
                    id: String(idx),
                    titulos: m.moduleName || m.name || `Módulo ${idx + 1}`,
                    cargas: m.workloadHours ? `${m.workloadHours}h` : '',
                    descricoes: m.description || '',
                }));
                setSyllabusBlocks(newBlocks);
                setTemplateMessage(`✅ ${mods.length} módulo(s) do curso preenchidos automaticamente.`);
            } else {
                setTemplateMessage('Curso sem módulos cadastrados — preencha a ementa manualmente.');
            }
        } catch {
            setTemplateMessage('Não foi possível carregar dados do curso para autopreenchimento.');
        } finally {
            setAutoFillLoading(false);
        }
    };

    const [issueError, setIssueError] = useState<string | null>(null);

    const issueCertificate = async (student: EligibleStudent) => {
        setIssuing(student.id);
        setIssueError(null);
        try {
            await api.post('/certificates', {
                studentId: student.id,
                classId: student.classId,
            });
            await fetchData();
        } catch (err: unknown) {
            setIssueError(formatCertificateIssueError(err));
        } finally {
            setIssuing(null);
        }
    };

    const buildQuickPreviewPayload = (studentId: string, classId: string): Record<string, unknown> => {
        const payload: Record<string, unknown> = { studentId, classId };
        if (templateCourseId.trim()) payload.previewCourseId = templateCourseId.trim();
        const versionId = selectedTemplateDetail?.currentVersion?.id;
        if (versionId) payload.templateVersionId = versionId;
        const pathOv = templatePdfPath.trim() || selectedTemplateDetail?.currentVersion?.pdfPath?.trim();
        if (pathOv) payload.pdfPathOverride = pathOv;
        if (templateType === 'PDF_BASE') {
            const o = buildLivePdfTextOverridesPayload();
            if (o && Object.keys(o).length > 0) payload.pdfTextOverrides = o;
        }
        const coordPayload = parseCoordFormToPayload(debouncedCoordForm);
        if (coordPayload && Object.keys(coordPayload).length > 0) payload.coordinateOverrides = coordPayload;
        return payload;
    };

    const previewCertificatePdf = async (studentId: string, classId: string) => {
        setPreviewing(`${studentId}:${classId}`);
        setIssueError(null);
        try {
            const res = await api.post(
                '/certificates/admin/preview-certificate-pdf',
                buildQuickPreviewPayload(studentId, classId),
                { responseType: 'blob' },
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || 'Erro na pré-visualização.';
            setIssueError(typeof msg === 'string' ? msg : 'Falha ao gerar PDF de teste. Ver matrícula ENROLLED/APROVADA e modelos publicados.');
        } finally {
            setPreviewing(null);
        }
    };

    const previewCertificatePdfEligible = (student: EligibleStudent) =>
        previewCertificatePdf(student.id, student.classId);

    const createPdfBaseTemplateFromDocumentModel = () => {
        // Reset COMPLETO — novo modelo começa 100% vazio/limpo
        setPdfParagraphTemplate('');
        setPdfDateTemplate('');
        setPdfPage2WorkloadTemplate('');
        setPdfSyllabusTitleContent('');
        setPdfSyllabusWorkloadContent('');
        setPdfSyllabusDescContent('');
        setSyllabusBlocks([{ id: '0', titulos: '', cargas: '', descricoes: '' }]);
        setQrPages({ page1: true, page2: false });
        setPdfUseBodyWhiteMask(false);
        setPdfUseP2TitleWhiteMask(false);
        setPdfDrawHeader(false);
        setPdfSignatureMode('AUTO');
        setPdfSignatureImagePath('');
        setCoordForm({});
        setDebouncedCoordForm({});
        setTemplateScope('COURSE_STATE');
        setTemplateType('PDF_BASE');
        setTemplateTitle('Modelo PDF base');
        setTemplatePdfPath('');
        setSelectedTemplateId('');
        setSelectedTemplateDetail(null);
        setTemplateModelTab('conteudo');
        setTemplateMessage(
            'Novo modelo em PDF_BASE preparado. Selecione o PNG de fundo em public/, ajuste textos/coordenadas e grave.',
        );
    };


    const verifyUrl = (code: string) => `${window.location.origin}/certificado/verificar/${code}`;

    // Computação da imagem de fundo nativa (substitui o iframe)
    const activeBackgroundPdfPath = templatePdfPath || selectedTemplateDetail?.currentVersion?.pdfPath || '';
    const isPdf = activeBackgroundPdfPath.toLowerCase().endsWith('.pdf');

    const getImageUrl = (path: string) => {
        if (!path) return '';
        // Converte barras do Windows para padrão Web
        let cleanPath = path.replace(/\\/g, '/');

        // Se o caminho vier absoluto do backend (ex: x:/.../public/certificados/...)
        const publicIndex = cleanPath.indexOf('/public/');
        if (publicIndex !== -1) {
            cleanPath = cleanPath.substring(publicIndex + '/public/'.length);
        } else if (cleanPath.startsWith('public/')) {
            cleanPath = cleanPath.substring('public/'.length);
        }

        // Garante a barra inicial
        return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    };

    const isVisualPreviewActive = !!activeBackgroundPdfPath;

    let backgroundImageUrl: string | null = null;
    if (isVisualPreviewActive && !isPdf) {
        const baseUrl = getImageUrl(activeBackgroundPdfPath);
        if (previewPage === 1) {
            backgroundImageUrl = baseUrl;
        } else {
            backgroundImageUrl = baseUrl.replace(/\.(png|jpg|jpeg)$/i, (ext) => `-verso${ext}`);
        }
    }

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
                <AdminHeaderHero
                    title="CERTIFICADOS"
                    subtitle="Emita e gerencie certificados digitais de conclusão"
                    badge="Painel oficial de emissão"
                    rightSlot={(
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                id="btn-download-modelo"
                                onClick={() => setShowDownloadMenu(v => !v)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: 10,
                                    background: '#EEF2FF',
                                    border: '1px solid #C7D2FE',
                                    fontSize: '0.8rem',
                                    color: '#3730A3',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                }}
                            >
                                📄 Baixar Modelo por UF ▾
                            </button>
                            {showDownloadMenu && (
                                <>
                                    {/* Overlay — fecha ao clicar fora. zIndex alto para estar acima do header admin */}
                                    <div
                                        onClick={() => setShowDownloadMenu(false)}
                                        style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
                                    />
                                    <style>{`
                                        .cert-uf-dd {
                                            position: absolute;
                                            top: calc(100% + 6px);
                                            right: 0;
                                            min-width: 240px;
                                        }
                                        @media (max-width: 640px) {
                                            .cert-uf-dd {
                                                right: auto;
                                                left: 0;
                                                min-width: 220px;
                                                max-width: calc(100vw - 32px);
                                            }
                                        }
                                    `}</style>
                                    <div className="cert-uf-dd" style={{
                                        background: '#fff',
                                        border: '1px solid #C7D2FE',
                                        borderRadius: 12,
                                        boxShadow: '0 8px 32px rgba(55,48,163,0.14)',
                                        zIndex: 9991,
                                        padding: '0.4rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.15rem',
                                    }}>
                                        <div style={{ padding: '0.4rem 0.7rem 0.25rem', fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.06em' }}>
                                            TEMPLATES PUBLICADOS (PDF)
                                        </div>
                                        {templates
                                            .filter(t => (t.scope === 'STATE' || t.scope === 'GLOBAL') && t.currentVersion?.status === 'PUBLISHED')
                                            .map(t => (
                                                <a
                                                    key={t.id}
                                                    href={`${apiBaseUrl}/certificates/template/model${t.state ? `?state=${t.state}` : ''}`}
                                                    download
                                                    onClick={() => setShowDownloadMenu(false)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        padding: '0.55rem 0.7rem',
                                                        borderRadius: 8,
                                                        textDecoration: 'none',
                                                        color: '#1E3A8A',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 600,
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <span style={{ fontSize: '1rem' }}>🗺️</span>
                                                    <div>
                                                        <div>{t.currentVersion?.title || t.key}</div>
                                                        <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                                                            {t.scope}{t.state ? ` • ${t.state}` : ''} • PDF
                                                        </div>
                                                    </div>
                                                </a>
                                            ))
                                        }
                                        {templates.filter(t => (t.scope === 'STATE' || t.scope === 'GLOBAL') && t.currentVersion?.status === 'PUBLISHED').length === 0 && (
                                            <div style={{ padding: '0.6rem 0.7rem', fontSize: '0.78rem', color: '#9CA3AF' }}>
                                                Nenhum modelo publicado ainda.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                />
                <div style={{ marginTop: '-0.6rem', padding: '0.7rem 0.9rem', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', maxWidth: 760 }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#1E3A8A', lineHeight: 1.6 }}>
                        O modelo de certificado abaixo e uma base visual oficial. Na emissao real, ele e preenchido automaticamente com os dados do aluno e do curso concluido (nome, curso, carga horaria, codigo e validacao).
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem' }}>
                    <AnimatedKpiCard label="Certificados Emitidos" value={issuedTotal} color="#059669" bg="#F0FDF4" border="#BBF7D0" />
                    <AnimatedKpiCard label="Alunos Elegíveis" value={eligibleTotal} color="#D97706" bg="#FFFBEB" border="#FDE68A" delayMs={60} />
                    <AnimatedKpiCard label="Modelos Disponíveis" value={templates.length} color="#2563EB" bg="#EFF6FF" border="#BFDBFE" delayMs={120} />
                </div>

                {/* Tabs + modo lista (elegíveis / emitidos) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', padding: '0.3rem', background: '#F3F4F6', borderRadius: 12, width: 'fit-content' }}>
                    {[
                        { key: 'eligible', label: '🎓 Elegíveis para Certificação', count: eligibleTotal },
                        { key: 'issued', label: '✅ Certificados Emitidos', count: issuedTotal },
                        { key: 'templates', label: '🎨 Modelos de Documento', count: templates.length },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            style={{
                                padding: '0.55rem 1.1rem', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                                background: tab === t.key ? '#FFD600' : 'transparent',
                                color: tab === t.key ? '#000' : '#6B7280',
                                boxShadow: tab === t.key ? '0 2px 8px rgba(255,214,0,0.35)' : 'none',
                            }}
                        >
                            {t.label} <span style={{ opacity: 0.7 }}>({t.count})</span>
                        </button>
                    ))}
                </div>
                {(tab === 'eligible' || tab === 'issued') && (
                    <AdminViewModeToggle
                        mode={tab === 'eligible' ? eligibleViewMode : issuedViewMode}
                        onChange={tab === 'eligible' ? setEligibleViewMode : setIssuedViewMode}
                    />
                )}
                </div>

                {/* -- Erro de emissão -- */}
                {issueError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }}>?</span>
                        <div>
                            <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '0.85rem', marginBottom: 4 }}>Erro ao Emitir Certificado</div>
                            <div style={{ fontSize: '0.78rem', color: '#7F1D1D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{issueError}</div>
                            <div style={{ fontSize: '0.74rem', color: '#9CA3AF', marginTop: 6 }}>
                                Inclui: frequência efectiva {'<'} 75% após penalidades de imprevisto, faltas injustificadas acima do permitido ou dados de turma incompletos.
                            </div>
                        </div>
                        <button onClick={() => setIssueError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>✕</button>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                    </div>
                ) : tab === 'eligible' ? (
                    <>
                    {/* -- ELIGIBLE STUDENTS -- */}
                    {eligible.length === 0 ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                            <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUM ALUNO ELEGÍVEL NO MOMENTO</p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Alunos com presença efectiva ≥ 75% após penalidades de imprevisto (motor único com a emissão).</p>
                        </div>
                    ) : eligibleViewMode === 'table' ? (
                        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ minWidth: 720 }}>
                                    <thead>
                                        <tr>
                                            <th>Aluno</th>
                                            <th>Curso</th>
                                            <th>Turma</th>
                                            <th>Frequência</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eligible.map((student) => (
                                            <tr key={`${student.id}:${student.classId}`}>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: '#111827' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{student.cpf}</div>
                                                </td>
                                                <td style={{ color: '#374151', fontWeight: 600 }}>{student.courseName}</td>
                                                <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#9CA3AF' }}>{student.classIdentifier}</td>
                                                <td>
                                                    <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.82rem', color: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }}>{student.attendanceRate}%</span>
                                                    {typeof student.imprevistoPenaltyPctSum === 'number' && student.imprevistoPenaltyPctSum > 0 && (
                                                        <div style={{ fontSize: '0.65rem', color: '#92400E', marginTop: 4, lineHeight: 1.35 }}>
                                                            Penal. imprevisto: −{student.imprevistoPenaltyPctSum}%
                                                            {typeof student.attendanceRateBeforePenaltyPct === 'number' && (
                                                                <> · antes {student.attendanceRateBeforePenaltyPct}%</>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => previewCertificatePdfEligible(student)}
                                                            disabled={previewing === `${student.id}:${student.classId}`}
                                                            className="btn-secondary"
                                                            style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
                                                        >
                                                            {previewing === `${student.id}:${student.classId}` ? '…' : '👁️ Pré-visualizar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => issueCertificate(student)}
                                                            disabled={issuing === student.id}
                                                            className="btn-primary"
                                                            style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
                                                        >
                                                            {issuing === student.id ? 'Emitindo…' : '🎓 Emitir'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {eligible.map((student, i) => (
                                <div key={student.id} className="glass-card animate-scale-in" style={{ animationDelay: `${i * 60}ms`, padding: '1.25rem', borderLeft: '3px solid #FFD600' }}>
                                    {/* Student */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 11, background: '#FFD600', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.8rem', color: '#000', flexShrink: 0 }}>
                                            {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}

                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>{student.cpf}</div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.4rem', fontWeight: 600 }}>{student.courseName}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.85rem', fontFamily: 'JetBrains Mono' }}>{student.classIdentifier}</div>

                                    {/* Attendance */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frequência</span>
                                            <span style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '0.85rem', color: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }}>
                                                {student.attendanceRate}%
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${Math.min(100, student.attendanceRate)}%`, background: student.attendanceRate >= 75 ? '#059669' : '#DC2626' }} />
                                        </div>
                                        {typeof student.imprevistoPenaltyPctSum === 'number' && student.imprevistoPenaltyPctSum > 0 && (
                                            <div style={{ fontSize: '0.65rem', color: '#92400E', marginTop: 6, lineHeight: 1.35 }}>
                                                Penalidades de imprevisto: −{student.imprevistoPenaltyPctSum}%
                                                {typeof student.attendanceRateBeforePenaltyPct === 'number' && (
                                                    <> · sem penalidades: {student.attendanceRateBeforePenaltyPct}%</>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => previewCertificatePdfEligible(student)}
                                            disabled={previewing === `${student.id}:${student.classId}`}
                                            className="btn-secondary"
                                            style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                                        >
                                            {previewing === `${student.id}:${student.classId}` ? 'A gerar pré-visualização…' : '👁️ Pré-visualizar PDF (sem emitir)'}
                                        </button>
                                        <button
                                            onClick={() => issueCertificate(student)}
                                            disabled={issuing === student.id}
                                            className="btn-primary"
                                            style={{ width: '100%', justifyContent: 'center' }}
                                        >
                                            {issuing === student.id ? (
                                                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Emitindo...</>
                                            ) : (
                                                '🎓 Emitir Certificado'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <AdminListPagination
                        page={eligiblePage}
                        totalPages={eligibleTotalPages}
                        total={eligibleTotal}
                        loading={loading}
                        onPageChange={setEligiblePage}
                        itemLabel="elegível(is)"
                    />
                    </>
                ) : tab === 'templates' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <CertificateTutorial />

                        {courses.length > 0 && (
                            <div className="glass-card" style={{ padding: '0.85rem 1rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#6B7280', marginBottom: '0.5rem', fontFamily: 'Orbitron' }}>CURSOS NO SISTEMA (seed / cadastro)</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {courses.map((c) => (
                                        <span
                                            key={c.id}
                                            style={{
                                                fontSize: '0.76rem',
                                                padding: '0.35rem 0.65rem',
                                                borderRadius: 999,
                                                background: '#FFFDE7',
                                                border: '1px solid #FEF08A',
                                                color: '#713F12',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {c.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="glass-card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontFamily: 'Orbitron', fontSize: '0.9rem', letterSpacing: '0.08em' }}>Modelos de Certificados</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={createPdfBaseTemplateFromDocumentModel}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            padding: '0.58rem 0.95rem',
                                            borderRadius: 10,
                                            border: '1px solid #2563EB',
                                            background: 'linear-gradient(180deg,#2563EB 0%, #1D4ED8 100%)',
                                            color: '#FFFFFF',
                                            fontWeight: 800,
                                            fontSize: '0.78rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 6px 18px rgba(29,78,216,0.25)',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>🧹</span>
                                        Limpar Editor
                                    </button>

                                    {/* PRIMARY ACTION: seed master templates */}
                                    <button
                                        type="button"
                                        onClick={seedMasterTemplates}
                                        disabled={seedingTemplates}
                                        title="Recria os Moldes Mestres oficiais para MA e PI com as imagens de fundo e coordenadas padrão. Use após enviar novos fundos para estes estados."
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.45rem',
                                            padding: '0.58rem 0.95rem',
                                            borderRadius: 10,
                                            border: '1px solid #059669',
                                            background: seedingTemplates
                                                ? 'linear-gradient(180deg, #6B7280 0%, #4B5563 100%)'
                                                : 'linear-gradient(180deg, #059669 0%, #047857 100%)',
                                            color: '#FFFFFF',
                                            fontWeight: 800,
                                            fontSize: '0.78rem',
                                            cursor: seedingTemplates ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 6px 18px rgba(5,150,105,0.25)',
                                            opacity: seedingTemplates ? 0.75 : 1,
                                        }}
                                    >
                                        {seedingTemplates
                                            ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Ativando...</>
                                            : <>🛠️ Recriar Moldes MA/PI</>}
                                    </button>

                                    {isDevelopment && (
                                        <details>
                                            <summary
                                                style={{
                                                    listStyle: 'none',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    padding: '0.5rem 0.75rem',
                                                    borderRadius: 10,
                                                    border: '1px solid #E5E7EB',
                                                    background: '#FFFFFF',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: '#475569',
                                                }}
                                            >
                                                ⚙️ Avançado (DEV)
                                            </summary>
                                            <div
                                                style={{
                                                    marginTop: '6px',
                                                    zIndex: 30,
                                                    minWidth: 230,
                                                    padding: 8,
                                                    borderRadius: 10,
                                                    border: '1px solid #E5E7EB',
                                                    background: '#FFFFFF',
                                                    boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
                                                    display: 'grid',
                                                    gap: 6,
                                                }}
                                            >
                                                <button className="btn-secondary" type="button" onClick={importTemplatesFromPublic}>Importação legada (desativada)</button>
                                                <button className="btn-secondary" type="button" onClick={backfillCertificateTemplateVersions} title="Preenche templateVersionId em certificados legados (admin)">
                                                    Backfill versões
                                                </button>
                                                <button className="btn-secondary" type="button" onClick={ensureDemoCertificate}>Certificado de teste</button>
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </div>
                            {isDevelopment && demoCertInfo && (
                                <div style={{ fontSize: '0.8rem', color: '#0F172A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.75rem' }}>
                                    {demoCertInfo}
                                </div>
                            )}
                            <div style={{ maxHeight: 360, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                                {templates.map((tpl) => (
                                    <div
                                        key={tpl.id}
                                        onClick={() => loadTemplateDetail(tpl.id)}
                                        style={{
                                            position: 'relative',
                                            textAlign: 'left',
                                            padding: '0.75rem',
                                            borderRadius: 10,
                                            border: selectedTemplateId === tpl.id ? '2px solid #FACC15' : '1px solid #E5E7EB',
                                            background: selectedTemplateId === tpl.id ? '#FFFBEB' : '#fff',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ paddingRight: '2rem' }}>
                                            {(() => {
                                                const badge = getTemplateBadge(
                                                    tpl.scope,
                                                    tpl.currentVersion?.status,
                                                    tpl.courseId,
                                                );
                                                return badge ? (
                                                    <span style={{
                                                        display: 'inline-block',
                                                        fontSize: '0.58rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.06em',
                                                        padding: '2px 6px',
                                                        borderRadius: 6,
                                                        marginBottom: 6,
                                                        background: badge.background,
                                                        color: badge.color,
                                                        border: badge.border,
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                ) : null;
                                            })()}
                                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827', lineHeight: 1.35 }}>{tpl.currentVersion?.title || tpl.key}</div>
                                            <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 4 }}>
                                                {tpl.scope}
                                                {tpl.course?.name ? ` • ${tpl.course.name}` : ''}
                                                {tpl.state ? ` • ${tpl.state}` : ''}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 4 }}>
                                                v{tpl.currentVersion?.version ?? 0} · {tpl.currentVersion?.templateType ?? '—'} · {tpl.currentVersion?.status ?? '—'} · {(tpl._count?.versions ?? tpl.versions?.length ?? 0)} vers.
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => deleteTemplate(tpl.id, e)}
                                            title="Apagar modelo"
                                            style={{
                                                position: 'absolute',
                                                top: '0.75rem',
                                                right: '0.75rem',
                                                background: '#FEE2E2',
                                                border: 'none',
                                                color: '#DC2626',
                                                borderRadius: '50%',
                                                width: 24,
                                                height: 24,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                            }}
                                        >🗑️</button>
                                    </div>
                                ))}
                                {templates.length === 0 && <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Nenhum modelo. Use importar ou reconstruir.</div>}
                            </div>
                        </div>

                        <div className="cert-templates-editor-grid">
                            <div
                                className="glass-card"
                                style={{
                                    padding: '1.25rem 1.5rem',
                                    border: '1px solid var(--border-yellow)',
                                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.06)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                                    <h3 style={{ margin: 0, fontFamily: 'Orbitron', fontSize: '0.88rem', letterSpacing: '0.08em', color: '#0F172A' }}>Editor do modelo</h3>
                                    <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>Modelo oficial: PDF base importado de <code className="mono">public/</code></span>
                                </div>
                                <div style={{ display: 'grid', gap: '0.65rem' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.04em' }}>TÍTULO DA VERSÃO</label>
                                    <input
                                        className="cert-tpl-input"
                                        value={templateTitle}
                                        onChange={(e) => setTemplateTitle(e.target.value)}
                                        placeholder="Título da versão"
                                        style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.88rem' }}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.65rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', color: '#9CA3AF', display: 'block', marginBottom: 4 }}>Âmbito</label>
                                            <select
                                                value={templateScope}
                                                onChange={(e) => setTemplateScope(e.target.value as 'GLOBAL' | 'COURSE' | 'STATE' | 'COURSE_STATE')}
                                                style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.8rem' }}
                                            >
                                                <option value="GLOBAL">Global</option>
                                                <option value="COURSE">Curso</option>
                                                <option value="STATE">Estado</option>
                                                <option value="COURSE_STATE">Curso + UF</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', color: '#9CA3AF', display: 'block', marginBottom: 4 }}>UF</label>
                                            <input
                                                list="certificados-uf-options"
                                                value={templateState}
                                                onChange={(e) => setTemplateState(e.target.value.toUpperCase().slice(0, 2))}
                                                placeholder="UF (ex: MA)"
                                                maxLength={2}
                                                style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.8rem', textTransform: 'uppercase' }}
                                            />
                                            <datalist id="certificados-uf-options">
                                                {availableUfOptions.map((uf) => (
                                                    <option key={uf} value={uf} />
                                                ))}
                                            </datalist>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', color: '#9CA3AF', display: 'block', marginBottom: 4 }}>Tipo</label>
                                            <select
                                                value={templateType}
                                                onChange={(e) => setTemplateType(e.target.value as 'PDF_BASE' | 'HTML')}
                                                style={{ width: '100%', padding: '0.55rem', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.8rem' }}
                                            >
                                                <option value="PDF_BASE">PDF base (import)</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* Curso vinculado — OBRIGATÓRIO */}
                                    <div>
                                        <label style={{ fontSize: '0.65rem', color: templateCourseId ? '#9CA3AF' : '#DC2626', display: 'block', marginBottom: 4, fontWeight: templateCourseId ? 400 : 700 }}>
                                            Curso vinculado {!templateCourseId && '(obrigatório)'}
                                        </label>
                                        <select
                                            value={templateCourseId}
                                            onChange={(e) => setTemplateCourseId(e.target.value)}
                                            style={{
                                                width: '100%', padding: '0.55rem', borderRadius: 8, fontSize: '0.8rem',
                                                border: templateCourseId ? '1px solid #E5E7EB' : '2px solid #DC2626',
                                                background: templateCourseId ? '#fff' : '#FEF2F2',
                                            }}
                                        >
                                            <option value="">Selecione o curso...</option>
                                            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                padding: 4,
                                                background: '#F3F4F6',
                                                borderRadius: 10,
                                                width: '100%',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setTemplateModelTab('conteudo')}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.45rem 0.5rem',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    fontSize: '0.73rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    background: templateModelTab === 'conteudo' ? '#FFFFFF' : 'transparent',
                                                    color: templateModelTab === 'conteudo' ? '#0F172A' : '#6B7280',
                                                    boxShadow: templateModelTab === 'conteudo' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                Conteúdo e textos
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTemplateModelTab('coordenadas')}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.45rem 0.5rem',
                                                    borderRadius: 8,
                                                    border: 'none',
                                                    fontSize: '0.73rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    background: templateModelTab === 'coordenadas' ? '#FFFFFF' : 'transparent',
                                                    color: templateModelTab === 'coordenadas' ? '#0F172A' : '#6B7280',
                                                    boxShadow: templateModelTab === 'coordenadas' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                Ajuste fino
                                            </button>
                                        </div>
                                        {templateModelTab === 'conteudo' ? (
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151' }}>Caminho do ficheiro PDF/Imagem (base artística)</label>
                                                <select
                                                    value={templatePdfPath}
                                                    onChange={(e) => setTemplatePdfPath(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.55rem 0.65rem',
                                                        borderRadius: 8,
                                                        border: '1px solid #E5E7EB',
                                                        fontSize: '0.78rem',
                                                        background: '#fff',
                                                    }}
                                                >
                                                    <option value="">Selecione o PDF/Imagem base</option>
                                                    {availablePdfs.map((f) => (
                                                        <option key={f.path} value={f.path}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                                    <label
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            padding: '0.45rem 0.7rem',
                                                            borderRadius: 8,
                                                            border: '1px solid #E5E7EB',
                                                            background: '#fff',
                                                            cursor: uploadingTemplateBase ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            color: '#334155',
                                                            opacity: uploadingTemplateBase ? 0.6 : 1,
                                                        }}
                                                    >
                                                        📤 Upload novo template
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.png,.jpg,.jpeg"
                                                            style={{ display: 'none' }}
                                                            disabled={uploadingTemplateBase}
                                                            onChange={(e) => uploadTemplateBase(e.target.files?.[0])}
                                                        />
                                                    </label>
                                                    <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                                        Aceita PDF/PNG/JPG. Ideal para novos estados.
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        marginTop: '0.35rem',
                                                        padding: '0.75rem 0.85rem',
                                                        borderRadius: 10,
                                                        background: '#FFFBF0',
                                                        border: '1px solid #FDE68A',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400E', marginBottom: '0.5rem', fontFamily: 'Orbitron', letterSpacing: '0.06em' }}>TEXTO SOBREPOSTO (PDF)</div>
                                                    <p style={{ fontSize: '0.72rem', color: '#78350F', lineHeight: 1.5, margin: '0 0 0.65rem 0' }}>
                                                        Utilize variáveis como <code>{'{{ALUNO_NOME}}'}</code>, <code>{'{{CURSO}}'}</code>, <code>{'{{CARGA_HORARIA}}'}</code>, <code>{'{{CIDADE}}'}</code>, <code>{'{{UF}}'}</code>.
                                                        Para negrito use <code>**texto**</code> (ex: <code>**{'{{CURSO}}'}**</code>). O texto quebrar-se-á automaticamente.
                                                    </p>
                                                    {pdfDrawHeader && (
                                                        <div style={{ marginBottom: '0.75rem', paddingBottom: '0.7rem', borderBottom: '1px dashed #FCD34D' }}>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', fontWeight: 'bold' }}>Nome do Aluno</label>
                                                            <div className="cert-coord-row" style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                                                <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    Posição X:
                                                                    <input type="number" value={coordForm['nameX'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, nameX: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="Auto" />
                                                                </label>
                                                                <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    Posição Y:
                                                                    <input type="number" value={coordForm['nameY'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, nameY: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="255" />
                                                                </label>
                                                                <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    Tamanho:
                                                                    <input type="number" value={coordForm['nameSize'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, nameSize: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="24" />
                                                                    <CoordFontStepper coordKey="nameSize" value={coordForm.nameSize ?? ''} onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <label style={{ fontSize: '0.65rem', color: '#78716C' }}>Parágrafo Principal</label>
                                                    <textarea
                                                        value={pdfParagraphTemplate}
                                                        onChange={(e) => setPdfParagraphTemplate(e.target.value)}
                                                        rows={6}
                                                        placeholder="Ex: Certificamos que {{ALUNO_NOME}} concluiu o curso de **{{CURSO}}**, com carga horária de {{CARGA_HORARIA}}h."
                                                        style={{ width: '100%', marginTop: 3, padding: '0.55rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.78rem', resize: 'vertical' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                                                        <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            Tamanho do parágrafo:
                                                            <input type="number" value={coordForm['bodyTextSize'] ?? ''} onChange={(e) => setCoordForm((prev) => ({ ...prev, bodyTextSize: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="17" />
                                                            <CoordFontStepper coordKey="bodyTextSize" value={coordForm.bodyTextSize ?? ''} onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))} />
                                                        </label>
                                                    </div>
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.7rem', borderTop: '1px dashed #FCD34D' }}>
                                                        <label style={{ fontSize: '0.65rem', color: '#78716C' }}>Formato da Data (Ex: {`{{CIDADE}} - {{UF}}, {{DATA_EXTENSO}}`})</label>
                                                        <input
                                                            value={pdfDateTemplate}
                                                            onChange={(e) => setPdfDateTemplate(e.target.value)}
                                                            placeholder="Texto da data..."
                                                            style={{ width: '100%', marginTop: 3, padding: '0.55rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.78rem' }}
                                                        />
                                                        <div className="cert-coord-row" style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Posição X:
                                                                <input type="number" value={coordForm['dateX'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, dateX: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="Auto" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Posição Y:
                                                                <input type="number" value={coordForm['dateY'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, dateY: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="Auto" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Tamanho:
                                                                <input type="number" value={coordForm['dateSize'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, dateSize: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="12" />
                                                                <CoordFontStepper coordKey="dateSize" value={coordForm.dateSize ?? ''} onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))} />
                                                            </label>
                                                        </div>
                                                        <div className="cert-coord-row" style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Posição X:
                                                                <input type="number" value={coordForm['p2CourseBoxX'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2CourseBoxX: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="421" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Posição Y:
                                                                <input type="number" value={coordForm['p2CourseBoxY'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2CourseBoxY: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="515" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Tamanho:
                                                                <input type="number" value={coordForm['p2CourseTextSize'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2CourseTextSize: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="15" />
                                                                <CoordFontStepper coordKey="p2CourseTextSize" value={coordForm.p2CourseTextSize ?? ''} onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))} />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.7rem', borderTop: '1px dashed #FCD34D' }}>
                                                        <label style={{ fontSize: '0.65rem', color: '#78716C' }}>Carga Horária Total (Pág. 2) (Ex: {`**{{CARGA_HORARIA}}H** CARGA HORÁRIA`})</label>
                                                        <input
                                                            value={pdfPage2WorkloadTemplate}
                                                            onChange={(e) => setPdfPage2WorkloadTemplate(e.target.value)}
                                                            placeholder="Texto da carga horária..."
                                                            style={{ width: '100%', marginTop: 3, padding: '0.55rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.78rem' }}
                                                        />
                                                        <div className="cert-coord-row" style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Posição X:
                                                                <input type="number" value={coordForm['p2WorkloadX'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2WorkloadX: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="290" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Posição Y:
                                                                <input type="number" value={coordForm['p2WorkloadY'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2WorkloadY: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="80" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Tamanho:
                                                                <input type="number" value={coordForm['p2WorkloadSize'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2WorkloadSize: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="14" />
                                                                <CoordFontStepper coordKey="p2WorkloadSize" value={coordForm.p2WorkloadSize ?? ''} onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))} />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Largura:
                                                                <input type="number" value={coordForm['p2WorkloadW'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, p2WorkloadW: e.target.value }))} style={{ width: 60, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="520" />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginTop: '0.65rem', display: 'grid', gap: '0.4rem', fontSize: '0.72rem', color: '#57534E' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 2, paddingLeft: 22 }}>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Y Inicial:
                                                                <input type="number" value={coordForm['syllabusY'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, syllabusY: e.target.value }))} style={{ width: 50, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="510" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Tamanho:
                                                                <input type="number" value={coordForm['syllabusTextSize'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, syllabusTextSize: e.target.value }))} style={{ width: 50, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="10" />
                                                                <CoordFontStepper coordKey="syllabusTextSize" value={coordForm.syllabusTextSize ?? ''} onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))} />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Col1 X:
                                                                <input type="number" value={coordForm['syllabusCol1X'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, syllabusCol1X: e.target.value }))} style={{ width: 50, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="40" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Col2 X:
                                                                <input type="number" value={coordForm['syllabusCol2X'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, syllabusCol2X: e.target.value }))} style={{ width: 50, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="290" />
                                                            </label>
                                                            <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                Col3 X:
                                                                <input type="number" value={coordForm['syllabusCol3X'] ?? ''} onChange={(e) => setCoordForm(prev => ({ ...prev, syllabusCol3X: e.target.value }))} style={{ width: 50, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="350" />
                                                            </label>
                                                        </div>
                                                        <div style={{ marginTop: 8, paddingLeft: 22 }}>
                                                            {/* === QR Code por Página === */}
                                                            <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed #FCD34D' }}>
                                                                <label style={{ fontSize: '0.65rem', color: '#78716C', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                                                                    QR Code de verificação
                                                                </label>
                                                                <p style={{ fontSize: '0.62rem', color: '#A1A1AA', margin: '0 0 6px', lineHeight: 1.4 }}>
                                                                    Escolha em qual página o QR de verificação aparece (pode ser em ambas).
                                                                </p>
                                                                <div style={{ display: 'flex', gap: 16 }}>
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', cursor: 'pointer' }}>
                                                                        <input type="checkbox" checked={qrPages.page1}
                                                                            onChange={e => setQrPages(p => ({ ...p, page1: e.target.checked }))} />
                                                                        Página 1 (frente)
                                                                    </label>
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', cursor: 'pointer' }}>
                                                                        <input type="checkbox" checked={qrPages.page2}
                                                                            onChange={e => setQrPages(p => ({ ...p, page2: e.target.checked }))} />
                                                                        Página 2 (verso)
                                                                    </label>
                                                                </div>
                                                                {qrPages.page2 && (
                                                                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                                                        <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            X:
                                                                            <input type="number" value={coordForm['p2QrX'] ?? ''} onChange={e => setCoordForm((prev: any) => ({ ...prev, p2QrX: e.target.value }))} style={{ width: 55, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="40" />
                                                                        </label>
                                                                        <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            Y:
                                                                            <input type="number" value={coordForm['p2QrY'] ?? ''} onChange={e => setCoordForm((prev: any) => ({ ...prev, p2QrY: e.target.value }))} style={{ width: 55, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="40" />
                                                                        </label>
                                                                        <label style={{ fontSize: '0.65rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                            Lado:
                                                                            <input type="number" value={coordForm['p2QrSize'] ?? ''} onChange={e => setCoordForm((prev: any) => ({ ...prev, p2QrSize: e.target.value }))} style={{ width: 55, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.75rem' }} placeholder="64" />
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* === Conteúdo Programático em Blocos === */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                                <label style={{ fontSize: '0.65rem', color: '#78716C', fontWeight: 700 }}>
                                                                    Conteúdo Programático (Pág 2)
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSyllabusBlocks(prev => [...prev, { id: `${Date.now()}`, titulos: '', cargas: '', descricoes: '' }])}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                                        padding: '0.25rem 0.65rem', borderRadius: 8,
                                                                        border: '1px solid #FCD34D', background: '#FFFBEB',
                                                                        color: '#92400E', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    + Bloco
                                                                </button>
                                                            </div>
                                                            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
                                                                {syllabusBlocks.map((block, idx) => (
                                                                    <div key={block.id} style={{
                                                                        padding: '0.6rem', borderRadius: 8,
                                                                        border: '1px solid #FCD34D', background: '#FFFDF0',
                                                                    }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                                                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#92400E' }}>Bloco {idx + 1}</span>
                                                                            {syllabusBlocks.length > 1 && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setSyllabusBlocks(prev => prev.filter(b => b.id !== block.id))}
                                                                                    style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', borderRadius: 6, padding: '0.1rem 0.45rem', cursor: 'pointer', fontSize: '0.65rem' }}
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6, alignItems: 'center' }}>
                                                                            <label style={{ fontSize: '0.60rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                Posição Y:
                                                                                <input
                                                                                    type="number"
                                                                                    value={coordForm[`syllabusBlock${idx}Y`] ?? ''}
                                                                                    onChange={(e) => setCoordForm((prev) => ({ ...prev, [`syllabusBlock${idx}Y`]: e.target.value }))}
                                                                                    style={{ width: 52, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.72rem' }}
                                                                                    placeholder="auto"
                                                                                />
                                                                            </label>
                                                                            <label style={{ fontSize: '0.60rem', color: '#78716C', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                                Tamanho:
                                                                                <input
                                                                                    type="number"
                                                                                    value={coordForm[`syllabusBlock${idx}Size`] ?? ''}
                                                                                    onChange={(e) => setCoordForm((prev) => ({ ...prev, [`syllabusBlock${idx}Size`]: e.target.value }))}
                                                                                    style={{ width: 52, padding: '0.2rem', borderRadius: 4, border: '1px solid #D4D4D8', fontSize: '0.72rem' }}
                                                                                    placeholder={coordForm.syllabusTextSize ?? '10'}
                                                                                />
                                                                                <CoordFontStepper
                                                                                    coordKey={`syllabusBlock${idx}Size`}
                                                                                    value={coordForm[`syllabusBlock${idx}Size`] ?? coordForm.syllabusTextSize ?? ''}
                                                                                    onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))}
                                                                                />
                                                                            </label>
                                                                        </div>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                                                            <div>
                                                                                <label style={{ fontSize: '0.60rem', color: '#78716C', display: 'block', marginBottom: 2 }}>Títulos</label>
                                                                                <textarea
                                                                                    value={block.titulos}
                                                                                    onChange={e => setSyllabusBlocks(prev => prev.map(b => b.id === block.id ? { ...b, titulos: e.target.value } : b))}
                                                                                    rows={4}
                                                                                    placeholder={"Introduçãoà Informática\nInternet e Navegação"}
                                                                                    style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.7rem', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.5 }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label style={{ fontSize: '0.60rem', color: '#78716C', display: 'block', marginBottom: 2 }}>Carga Horária</label>
                                                                                <textarea
                                                                                    value={block.cargas}
                                                                                    onChange={e => setSyllabusBlocks(prev => prev.map(b => b.id === block.id ? { ...b, cargas: e.target.value } : b))}
                                                                                    rows={4}
                                                                                    placeholder={"8h\n6h"}
                                                                                    style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.7rem', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.5 }}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label style={{ fontSize: '0.60rem', color: '#78716C', display: 'block', marginBottom: 2 }}>Descrições</label>
                                                                                <textarea
                                                                                    value={block.descricoes}
                                                                                    onChange={e => setSyllabusBlocks(prev => prev.map(b => b.id === block.id ? { ...b, descricoes: e.target.value } : b))}
                                                                                    rows={4}
                                                                                    placeholder={"Conceitos básicos...\nNavegadores, e-mail..."}
                                                                                    style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.7rem', resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.5 }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                                                            <input type="checkbox" checked={pdfUseBodyWhiteMask} onChange={(e) => setPdfUseBodyWhiteMask(e.target.checked)} />
                                                            Máscara branca no corpo (pág. 1) — só se o PDF tiver texto antigo a esconder; desligado preserva o fundo do modelo
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                            <input type="checkbox" checked={pdfUseP2TitleWhiteMask} onChange={(e) => setPdfUseP2TitleWhiteMask(e.target.checked)} />
                                                            Máscara branca no título do curso (verso, pág. 2)
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                            <input type="checkbox" checked={pdfDrawHeader} onChange={(e) => setPdfDrawHeader(e.target.checked)} />
                                                            Desenhar nome do aluno + linha de detalhes no topo (desligar se o arte do PDF já tiver essa área)
                                                        </label>
                                                    </div>
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.7rem', borderTop: '1px dashed #FCD34D', display: 'grid', gap: 6 }}>
                                                        <label style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: 700 }}>Assinatura final</label>
                                                        <select
                                                            value={pdfSignatureMode}
                                                            onChange={(e) => setPdfSignatureMode(e.target.value as 'AUTO' | 'IMAGE' | 'PADES' | 'BOTH' | 'NONE')}
                                                            style={{ width: '100%', padding: '0.45rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.78rem' }}
                                                        >
                                                            <option value="AUTO">AUTO (imagem se houver + PAdES)</option>
                                                            <option value="IMAGE">Só imagem da assinatura</option>
                                                            <option value="PADES">Só assinatura digital (PAdES)</option>
                                                            <option value="BOTH">Imagem + PAdES</option>
                                                            <option value="NONE">Sem assinatura</option>
                                                        </select>
                                                        <input
                                                            value={pdfSignatureImagePath}
                                                            onChange={(e) => setPdfSignatureImagePath(e.target.value)}
                                                            placeholder="Caminho da imagem (PNG/JPG) — vazio usa CERT_TEMPLATE_SIGNATURE_IMAGE_PATH"
                                                            style={{ width: '100%', padding: '0.45rem', borderRadius: 6, border: '1px solid #FCD34D', fontSize: '0.78rem', fontFamily: 'JetBrains Mono,monospace' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    padding: '0.9rem 1rem',
                                                    borderRadius: 12,
                                                    background: 'linear-gradient(180deg, #FAFAFA 0%, #F4F4F5 100%)',
                                                    border: '1px solid #E4E4E7',
                                                }}
                                            >
                                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: '#52525B', lineHeight: 1.55 }}>
                                                    Valores em pontos PDF. O desenho vermelho mostra a área de cada campo. O pedido de preview com <strong>Debug</strong> envia o JSON ainda em edição; grave uma versão (Rascunho) para persistir no banco.
                                                </p>
                                                <label style={{ fontSize: '0.65rem', color: '#71717A', display: 'block', marginBottom: 6 }}>Matrícula de teste (pré-requisito: aluno aprovado na turma)</label>
                                                <select
                                                    value={previewTestKey}
                                                    onChange={(e) => setPreviewTestKey(e.target.value)}
                                                    style={{ width: '100%', marginBottom: 10, padding: '0.5rem', borderRadius: 8, border: '1px solid #E4E4E7', fontSize: '0.8rem' }}
                                                >
                                                    <option value="">— Seleccione um aluno na aba Elegíveis —</option>
                                                    {eligible.map((s) => (
                                                        <option key={`${s.id}-${s.classId}`} value={`${s.id}:${s.classId}`}>
                                                            {s.name} — {s.classIdentifier}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                                                        gap: 8,
                                                        marginBottom: 12,
                                                    }}
                                                >
                                                    {COORDINATE_FIELD_KEYS.map(({ key, label }) => (
                                                        <div key={key}>
                                                            <label
                                                                style={{
                                                                    fontSize: '0.6rem',
                                                                    color: '#A1A1AA',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.04em',
                                                                }}
                                                            >
                                                                {label}
                                                            </label>
                                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                                                <input
                                                                    value={coordForm[key] ?? ''}
                                                                    onChange={(e) => setCoordForm((prev) => ({ ...prev, [key]: e.target.value }))}
                                                                    inputMode="decimal"
                                                                    placeholder="—"
                                                                    style={{
                                                                        flex: 1,
                                                                        minWidth: 0,
                                                                        padding: '0.4rem 0.5rem',
                                                                        borderRadius: 7,
                                                                        border: '1px solid #D4D4D8',
                                                                        fontSize: '0.78rem',
                                                                        fontFamily: 'JetBrains Mono,monospace',
                                                                    }}
                                                                />
                                                                {key.endsWith('Size') && (
                                                                    <CoordFontStepper
                                                                        coordKey={key}
                                                                        value={coordForm[key] ?? ''}
                                                                        onChange={(k, v) => setCoordForm((prev) => ({ ...prev, [k]: v }))}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-primary"
                                                        style={{ fontSize: '0.8rem' }}
                                                        onClick={() => void runDebugCoordinatePreview()}
                                                        disabled={debugPreviewLoading}
                                                    >
                                                        {debugPreviewLoading ? 'A gerar…' : 'Visualizar com debug'}
                                                    </button>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#3F3F46', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={autoCoordDebugPreview}
                                                            onChange={(e) => setAutoCoordDebugPreview(e.target.checked)}
                                                        />
                                                        Pré-atualizar após 500ms (debounce)
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.68rem',
                                            color: '#4B5563',
                                            lineHeight: 1.6,
                                            padding: '0.5rem 0.65rem',
                                            background: '#F8FAFC',
                                            borderRadius: 8,
                                            border: '1px dashed #CBD5E1',
                                        }}
                                    >
                                        <span style={{ fontWeight: 700, color: '#0F172A' }}>Variáveis: </span>
                                        {'{{ALUNO_NOME}}'} · {'{{CURSO_NOME}}'} · {'{{CARGA_HORARIA}}'} · {'{{CIDADE}}'} · {'{{ESTADO}}'} · {'{{DATA_EMISSAO}}'} · {'{{CODIGO_VERIFICACAO}}'} · {'{{QR_CODE_DATA_URL}}'} · {'{{TURMA}}'} · {'{{EMISSOR}}'}
                                    </div>
                                    {/* MEL-08: 5 botões com semântica clara conforme definição do Ronaldo */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280' }}>Salvar modelo</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {/* 1. Rascunho */}
                                            <button
                                                className="btn-secondary"
                                                type="button"
                                                title="Grava textos, coordenadas e ementa na biblioteca (rascunho — não altera a emissão)"
                                                disabled={savingTemplate}
                                                onClick={() => void saveModelToLibrary()}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                {savingTemplate ? 'Salvando…' : '💾 Salvar na biblioteca de modelos'}
                                            </button>
                                            {/* 2. Publicar este modelo (salva + publica + abre prévia) */}
                                            <button
                                                className="btn-primary"
                                                type="button"
                                                title={isAdmin
                                                    ? 'Publica e vincula como modelo oficial usado na emissão deste curso/UF'
                                                    : 'Somente administrador pode tornar o modelo oficial na emissão'}
                                                disabled={savingTemplate || !isAdmin}
                                                onClick={() => void makeModelOfficialForCourse()}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    opacity: isAdmin ? 1 : 0.55,
                                                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                                                }}
                                            >
                                                {savingTemplate ? 'Publicando…' : '⭐ Tornar oficial do curso'}
                                            </button>
                                        </div>
                                        {!isAdmin && (
                                            <p style={{ margin: 0, fontSize: '0.68rem', color: '#6B7280', lineHeight: 1.45 }}>
                                                Coordenadores podem salvar rascunhos. Apenas administrador torna o modelo oficial na emissão.
                                            </p>
                                        )}

                                        {selectedTemplateId && (
                                            <>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7280', marginTop: 4 }}>Outras ações</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        title="Cria uma cópia deste modelo para editar ou adicionar ao set"
                                                        onClick={openDuplicateModal}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        📋 Duplicar este modelo
                                                    </button>
                                                </div>

                                                {/* Histórico de versões */}
                                                <div style={{ maxHeight: 120, overflow: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: '0.5rem', background: '#fff' }}>
                                                    {(selectedTemplateDetail?.versions || []).map((v) => (
                                                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.72rem', padding: '0.2rem 0' }}>
                                                            <span style={{ color: '#111827' }}>v{v.version} · {v.title}</span>
                                                            <span style={{ color: '#6B7280' }}>{v.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {/* 5. Vincular ao Curso — ação separada */}
                                        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.6rem', marginTop: 4 }}>
                                            <button
                                                type="button"
                                                title="Define a qual curso este certificado pertence e preenche dados automaticamente"
                                                onClick={() => {
                                                    setVinculoCursoInput(templateCourseId);
                                                    setShowVinculoCursoModal(true);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '0.5rem 1rem', borderRadius: 9,
                                                    background: templateCourseId ? 'rgba(5,150,105,0.08)' : 'rgba(37,99,235,0.08)',
                                                    border: `1px solid ${templateCourseId ? 'rgba(5,150,105,0.35)' : 'rgba(37,99,235,0.35)'}`,
                                                    color: templateCourseId ? '#065F46' : '#1E40AF',
                                                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                                                }}
                                            >
                                                🔗 {templateCourseId
                                                    ? `Curso: ${courses.find(c => c.id === templateCourseId)?.name || '…'}`
                                                    : 'Vincular certificado ao curso'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal Duplicar — padrão da casa com createPortal */}
                                    {showDuplicateModal && (
                                        <ModalPortal>
                                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                                <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s' }}>
                                                    <div style={{ padding: '20px 24px 14px', background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', borderRadius: '18px 18px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📋</div>
                                                        <div>
                                                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>DUPLICAR MODELO</div>
                                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Uma cópia será criada e selecionada automaticamente</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 6 }}>
                                                                Título da cópia
                                                            </label>
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                value={duplicateTitleInput}
                                                                onChange={e => setDuplicateTitleInput(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') void confirmDuplicate(); if (e.key === 'Escape') setShowDuplicateModal(false); }}
                                                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.9rem', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                                            <button type="button" onClick={() => setShowDuplicateModal(false)} disabled={duplicatingModal}
                                                                style={{ padding: '0.55rem 1.1rem', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                Cancelar
                                                            </button>
                                                            <button type="button" onClick={() => void confirmDuplicate()} disabled={duplicatingModal || !duplicateTitleInput.trim()}
                                                                style={{ padding: '0.55rem 1.25rem', borderRadius: 9, background: duplicatingModal ? '#E5E7EB' : 'linear-gradient(135deg,#1E3A8A,#2563EB)', border: 'none', color: '#fff', fontWeight: 700, cursor: duplicatingModal ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                                                                {duplicatingModal ? 'Duplicando…' : '📋 Duplicar'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </ModalPortal>
                                    )}

                                    {/* Modal Vincular ao Curso — createPortal com autopreenchimento */}
                                    {showVinculoCursoModal && (
                                        <ModalPortal>
                                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', zIndex: MODAL_PORTAL_Z_INDEX, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                                <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s' }}>
                                                    <div style={{ padding: '20px 24px 14px', background: 'linear-gradient(135deg,#059669,#047857)', borderRadius: '18px 18px 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🔗</div>
                                                        <div>
                                                            <div style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 900, color: '#fff', letterSpacing: '0.06em' }}>VINCULAR AO CURSO</div>
                                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Os dados do curso preencherão a ementa automaticamente</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: 6 }}>
                                                                Curso *
                                                            </label>
                                                            <select
                                                                value={vinculoCursoInput}
                                                                onChange={e => setVinculoCursoInput(e.target.value)}
                                                                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.85rem', color: '#111827', outline: 'none', cursor: 'pointer' }}
                                                            >
                                                                <option value="">Selecione o curso…</option>
                                                                {courses.map(c => (
                                                                    <option key={c.id} value={c.id}>{c.name}{c.workloadHours ? ` — ${c.workloadHours}h` : ''}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div style={{ padding: '10px 12px', borderRadius: 9, background: '#F0FDF4', border: '1px solid #A7F3D0', fontSize: '0.78rem', color: '#065F46', lineHeight: 1.5 }}>
                                                            💡 <strong>Autopreenchimento:</strong> ao vincular, a ementa e a carga horária serão preenchidas automaticamente com os módulos cadastrados no curso.
                                                            O vínculo com o curso só é persistido ao usar <strong>Salvar na biblioteca</strong> ou <strong>Tornar oficial do curso</strong>.
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                                            <button type="button" onClick={() => setShowVinculoCursoModal(false)}
                                                                style={{ padding: '0.55rem 1.1rem', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={!vinculoCursoInput || autoFillLoading}
                                                                onClick={async () => {
                                                                    setTemplateCourseId(vinculoCursoInput);
                                                                    setShowVinculoCursoModal(false);
                                                                    await handleAutoFillFromCourse(vinculoCursoInput);
                                                                }}
                                                                style={{ padding: '0.55rem 1.25rem', borderRadius: 9, background: (!vinculoCursoInput || autoFillLoading) ? '#E5E7EB' : 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: '#fff', fontWeight: 700, cursor: (!vinculoCursoInput || autoFillLoading) ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                                                                {autoFillLoading ? 'Carregando…' : '🔗 Vincular e preencher'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </ModalPortal>
                                    )}
                                </div>
                            </div>

                            <div
                                className="glass-card"
                                style={{
                                    padding: '1.15rem 1.2rem',
                                    position: 'sticky',
                                    top: 12,
                                    alignSelf: 'start',
                                    border: '1px solid rgba(8,145,178,0.25)',
                                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <h3 style={{ margin: 0, fontFamily: 'Orbitron', fontSize: '0.85rem', letterSpacing: '0.08em', color: '#0C4A6E' }}>Pré-visualização ao vivo</h3>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {/* Page toggle */}
                                        {isVisualPreviewActive && (
                                            <div style={{ display: 'flex', gap: '0.2rem', background: '#F1F5F9', padding: '0.2rem', borderRadius: 6 }}>
                                                <button
                                                    onClick={() => setPreviewPage(1)}
                                                    style={{
                                                        padding: '4px 10px', fontSize: '0.62rem',
                                                        background: previewPage === 1 ? '#0284C7' : 'transparent',
                                                        color: previewPage === 1 ? '#FFF' : '#475569',
                                                        border: 'none', borderRadius: 4, cursor: 'pointer',
                                                        fontWeight: previewPage === 1 ? 700 : 500
                                                    }}
                                                >Frente (Pág 1)</button>
                                                <button
                                                    onClick={() => setPreviewPage(2)}
                                                    style={{
                                                        padding: '4px 10px', fontSize: '0.62rem',
                                                        background: previewPage === 2 ? '#0284C7' : 'transparent',
                                                        color: previewPage === 2 ? '#FFF' : '#475569',
                                                        border: 'none', borderRadius: 4, cursor: 'pointer',
                                                        fontWeight: previewPage === 2 ? 700 : 500
                                                    }}
                                                >Verso (Pág 2)</button>
                                            </div>
                                        )}
                                        {/* Ver PDF Real */}
                                        <button
                                            onClick={() => void openRealPdfModal()}
                                            style={{ padding: '4px 10px', fontSize: '0.62rem', background: '#0F172A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                                            title="Ver o PDF final com os dados reais do aluno"
                                        >📄 Ver PDF Final</button>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '0 0 0.75rem 0' }}>
                                    A imagem de fundo actualiza-se assim que escolhe o ficheiro. Use o botão "Recriar Moldes Mestres" abaixo dos modelos para gerar/restaurar moldes oficiais por UF com coordenadas calibradas.
                                </p>

                                {/* Loading spinner */}
                                {pdfPreviewLoading && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: '#F0F9FF', borderRadius: 8, marginBottom: '0.5rem', fontSize: '0.78rem', color: '#0369A1' }}>
                                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                        A gerar PDF…
                                    </div>
                                )}

                                {/* Main preview */}
                                {isVisualPreviewActive && (
                                    <div style={{ position: 'relative', width: '100%', maxWidth: '1024px', margin: '0 auto', aspectRatio: '1.4142', border: '1px solid #E2E8F0', borderRadius: 8, background: '#111', overflow: 'hidden' }}>
                                        {isPdf ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', color: '#fff', fontSize: '0.85rem', padding: '2rem', textAlign: 'center', background: '#1F2937' }}>
                                                Para usar o editor visual drag-and-drop, selecione um arquivo de imagem (.png ou .jpg) no dropdown.
                                            </div>
                                        ) : (
                                            backgroundImageUrl && (
                                                <img
                                                    src={backgroundImageUrl}
                                                    alt="Template Background"
                                                    style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }}
                                                />
                                            )
                                        )}
                                        <CertificateDraggableOverlay
                                            coordForm={coordForm}
                                            setCoordForm={setCoordForm}
                                            pdfParagraphTemplate={pdfParagraphTemplate}
                                            pdfDateTemplate={pdfDateTemplate}
                                            pdfPage2WorkloadTemplate={pdfPage2WorkloadTemplate}
                                            previewPage={previewPage}
                                            pdfDrawHeader={pdfDrawHeader}
                                            previewSample={pdfLivePreviewSample}
                                            syllabusBlocks={syllabusBlocks}
                                            showQrGhost={qrPages.page1}
                                            showQrGhostP2={previewPage === 2 && qrPages.page2}
                                        />
                                    </div>
                                )}

                                {/* Debug overlay (coordenadas tab only) */}
                                {templateModelTab === 'coordenadas' && debugPreviewUrl && !pdfPreviewLoading && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <p style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, margin: '0 0 0.25rem' }}>?? Debug (contornos vermelhos)</p>
                                        <iframe
                                            key={debugPreviewUrl}
                                            title="PDF debug coordenadas"
                                            src={debugPreviewUrl}
                                            style={{ width: '100%', height: 400, border: '1px solid rgba(220,38,38,0.35)', borderRadius: 8, background: '#0C0A09' }}
                                        />
                                    </div>
                                )}

                                {/* Empty states */}
                                {!isVisualPreviewActive && !pdfPreviewLoading && !templatePdfPath && !selectedTemplateDetail && (
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '2px dashed #CBD5E1', borderRadius: 10 }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                                        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                                            Selecione um modelo na grelha <strong>ou</strong> escolha um ficheiro de fundo no dropdown para ver o preview instantâneo.
                                        </p>
                                    </div>
                                )}
                                {!isVisualPreviewActive && !pdfPreviewLoading && (templatePdfPath || selectedTemplateDetail) && !previewTestKey.includes(':') && (
                                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', border: '1px dashed #FCD34D', borderRadius: 10, background: '#FFFBEB' }}>
                                        <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
                                            ?? Nenhum aluno de teste encontrado. Certifique-se de que existem matrículas <strong>ENROLLED/APPROVED</strong> na base de dados.
                                        </p>
                                    </div>
                                )}
                                {!isVisualPreviewActive && !pdfPreviewLoading && (templatePdfPath || selectedTemplateDetail) && previewTestKey.includes(':') && (
                                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: 10 }}>
                                        <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                                            ?? A preparar pré-visualização…
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {templateMessage && (
                            <div style={{ fontSize: '0.8rem', color: '#1E3A8A', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                                {templateMessage}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                    {/* -- ISSUED CERTIFICATES -- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.5 }}>
                                Cada linha reflete um certificado já emitido. O download do PDF é gerado de novo a cada pedido (modelo + dados actuais). Use <strong>Testar modelo</strong> para pré-visualizar sem alterar o registo (útil após mudar o modelo publicado).
                            </p>
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={purgeIssuedCertificates}
                                style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B', fontWeight: 700 }}
                            >
                                Apagar todos os certificados emitidos
                            </button>
                        </div>
                        {certificates.length === 0 ? (
                            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                                <p style={{ fontFamily: 'Orbitron', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>NENHUM CERTIFICADO EMITIDO AINDA</p>
                            </div>
                        ) : issuedViewMode === 'card' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {certificates.map((cert, i) => (
                                    <div
                                        key={cert.id}
                                        className="adm-kpi-card adm-scale-in glass-card animate-scale-in"
                                        style={{
                                            animationDelay: `${i * 40}ms`,
                                            padding: '1.1rem',
                                            borderLeft: '3px solid #FFD600',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.65rem',
                                        }}
                                    >
                                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#B89B00', fontWeight: 800 }}>{cert.verificationCode}</div>
                                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>{cert.student?.user?.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#374151' }}>{cert.class?.course?.name}</div>
                                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#9CA3AF' }}>{cert.class?.classIdentifier}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                            Emitido em {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                                        </div>
                                        <span style={{
                                            alignSelf: 'flex-start',
                                            padding: '0.2rem 0.55rem',
                                            borderRadius: 100,
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            background: cert.status === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                                            color: cert.status === 'ACTIVE' ? '#059669' : '#DC2626',
                                            border: `1px solid ${cert.status === 'ACTIVE' ? '#BBF7D0' : '#FECACA'}`,
                                            textTransform: 'uppercase',
                                        }}>
                                            {cert.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                            <button type="button" onClick={() => { setSelected(cert); document.body.style.overflow = 'hidden'; }}
                                                style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>
                                                🔍 Ver QR
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => previewCertificatePdf(cert.studentId, cert.classId)}
                                                disabled={previewing === `${cert.studentId}:${cert.classId}`}
                                                style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                {previewing === `${cert.studentId}:${cert.classId}` ? '…' : '🧪 Testar modelo'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => syncCertificateToPublishedTemplate(cert.id)}
                                                style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#F5F3FF', border: '1px solid #C4B5FD', color: '#5B21B6', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                🔄 Sincronizar modelo
                                            </button>
                                            {cert.fileUrl ? (
                                                <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer"
                                                    style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                                                    📄 PDF
                                                </a>
                                            ) : (
                                                <span style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#D1D5DB', fontSize: '0.74rem', textAlign: 'center' }}>Sem PDF</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Aluno</th>
                                            <th>Curso</th>
                                            <th>Turma</th>
                                            <th>Emitido em</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {certificates.map(cert => (
                                            <tr key={cert.id}>
                                                <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#B89B00', fontWeight: 700 }}>{cert.verificationCode}</span></td>
                                                <td style={{ fontWeight: 600, color: '#111827' }}>{cert.student?.user?.name}</td>
                                                <td style={{ color: '#374151' }}>{cert.class?.course?.name}</td>
                                                <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#9CA3AF' }}>{cert.class?.classIdentifier}</td>
                                                <td style={{ fontSize: '0.78rem', color: '#9CA3AF', fontFamily: 'JetBrains Mono' }}>
                                                    {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700,
                                                        background: cert.status === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                                                        color: cert.status === 'ACTIVE' ? '#059669' : '#DC2626',
                                                        border: `1px solid ${cert.status === 'ACTIVE' ? '#BBF7D0' : '#FECACA'}`,
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        {cert.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        <button type="button" onClick={() => { setSelected(cert); document.body.style.overflow = 'hidden'; }}
                                                            style={{ padding: '0.4rem 0.85rem', borderRadius: 7, background: '#FFFDE7', border: '1px solid #FEF08A', color: '#92730A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                            🔍 Ver QR
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => previewCertificatePdf(cert.studentId, cert.classId)}
                                                            disabled={previewing === `${cert.studentId}:${cert.classId}`}
                                                            style={{ padding: '0.4rem 0.85rem', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                        >
                                                            {previewing === `${cert.studentId}:${cert.classId}` ? '…' : '🧪 Testar modelo'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => syncCertificateToPublishedTemplate(cert.id)}
                                                            style={{ padding: '0.4rem 0.85rem', borderRadius: 7, background: '#F5F3FF', border: '1px solid #C4B5FD', color: '#5B21B6', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                            title="Alinha a versão de modelo do certificado à publicada (mais recente)"
                                                        >
                                                            🔄 Sincronizar modelo
                                                        </button>
                                                        {cert.fileUrl ? (
                                                            <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer"
                                                                style={{ padding: '0.4rem 0.85rem', borderRadius: 7, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                                                                📄 PDF
                                                            </a>
                                                        ) : (
                                                            <span style={{ padding: '0.4rem 0.85rem', borderRadius: 7, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#D1D5DB', fontSize: '0.75rem' }}>Sem PDF</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    <AdminListPagination
                        page={issuedPage}
                        totalPages={issuedTotalPages}
                        total={issuedTotal}
                        loading={loading}
                        onPageChange={setIssuedPage}
                        itemLabel="certificado(s)"
                    />
                    </>
                )}

                {/* QR Code Modal */}
                {selected && (
                    <ModalPortal>
                    <div className="modal-overlay" style={{ zIndex: MODAL_PORTAL_Z_INDEX }} onClick={() => { setSelected(null); document.body.style.overflow = ''; }}>
                        <div className="modal-content" style={{ maxWidth: 420, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setSelected(null); document.body.style.overflow = ''; }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                                <h3 style={{ fontFamily: 'Orbitron', fontWeight: 900, fontSize: '1rem', color: '#111827', marginBottom: '0.25rem' }}>
                                    Certificado de Conclusão
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>{selected.student?.user?.name}</p>
                                <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{selected.class?.course?.name}</p>
                            </div>

                            {/* QR Code */}
                            <div style={{ display: 'inline-flex', padding: '1.25rem', borderRadius: 16, background: '#FFFFFF', border: '2px solid #FFD600', boxShadow: '0 4px 16px rgba(255,214,0,0.2)', marginBottom: '1.25rem' }}>
                                <QRCodeSVG
                                    value={typeof window !== 'undefined' ? verifyUrl(selected.verificationCode) : selected.verificationCode}
                                    size={160}
                                    level="H"
                                    fgColor="#111827"
                                />
                            </div>

                            <div style={{ padding: '0.65rem 1rem', borderRadius: 10, background: '#FFFDE7', border: '1px solid #FEF08A', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Código de Verificação</div>
                                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 900, color: '#B89B00', fontSize: '0.88rem', letterSpacing: '0.1em' }}>{selected.verificationCode}</div>
                            </div>

                            <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Escaneie o QR Code para verificar a autenticidade do certificado</p>
                        </div>
                    </div>
                    </ModalPortal>
                )}
            </div>

            {/* -- Modal: Ver PDF Real -- */}
            {pdfModalOpen && (
                <ModalPortal>
                <div
                    onClick={() => setPdfModalOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: MODAL_PORTAL_Z_INDEX,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#0F172A',
                            borderRadius: 16,
                            width: '92vw', maxWidth: 1100,
                            height: '90vh',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', color: '#fff', letterSpacing: '0.08em', fontWeight: 700 }}>
                                ?? PDF FINAL — GERADO PELO BACKEND
                            </span>
                            <button
                                onClick={() => setPdfModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}
                            >✕</button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                            {pdfModalLoading && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8', gap: 10, fontSize: '0.88rem' }}>
                                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                                    A gerar o PDF final com os dados do aluno…
                                </div>
                            )}
                            {!pdfModalLoading && pdfModalUrl && (
                                <iframe
                                    title="PDF Final Real"
                                    src={`${pdfModalUrl}#toolbar=1&view=FitH`}
                                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                />
                            )}
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </>
    );
}

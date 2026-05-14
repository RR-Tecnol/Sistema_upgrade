'use client';

import type { AdminTutorialStep } from '@/components/admin/AdminCollapsibleTutorial';

/** Passos do guia do editor de certificados (extraído do antigo CertificateTutorial). */
export const CERTIFICATE_EDITOR_TUTORIAL_STEPS: AdminTutorialStep[] = [
{
    num: '1',
    color: '#3B82F6',
    title: 'Os 2 Moldes Mestre são automáticos',
    body: (
        <>
            O sistema vem com <strong>modelos oficiais por UF</strong>. Cada um usa o fundo limpo (frente + verso) das pastas{' '}
            <code className="mono" style={{ fontSize: '0.72rem', background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>certificados/maranhao/</code> e{' '}
            <code className="mono" style={{ fontSize: '0.72rem', background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>certificados/piaui/</code>.
            Eles aplicam-se automaticamente a <strong>qualquer curso</strong> da UF, sem precisar criar um por curso.
        </>
    ),
},
{
    num: '2',
    color: '#F59E0B',
    title: 'Como editar um modelo (texto, posição, cores)',
    body: (
        <>
            Clique num modelo na lista abaixo para abrir o editor. À esquerda você ajusta:{' '}
            <strong>caminho do PDF/imagem</strong>, <strong>parágrafo principal</strong>,{' '}
            <strong>data extensa</strong>, <strong>texto da página 2</strong> e as{' '}
            <strong>coordenadas (X/Y/tamanho)</strong> de cada elemento.
            À direita, a <strong>pré-visualização ao vivo</strong> atualiza-se enquanto você digita.
            Use o botão <strong>Ver PDF Final</strong> para gerar o PDF final (como no envio oficial) a qualquer momento.
        </>
    ),
},
{
    num: '3',
    color: '#10B981',
    title: 'Variáveis disponíveis (preenchidas automaticamente)',
    body: (
        <>
            No editor de texto use chaves duplas. Estas variáveis são substituídas pelos dados reais do aluno na hora de emitir:
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                {[
                    { v: '{{ALUNO_NOME}}', d: 'Nome cadastrado' },
                    { v: '{{CURSO}}', d: 'Nome do curso' },
                    { v: '{{CARGA_HORARIA}}', d: 'Horas do curso' },
                    { v: '{{CIDADE}}', d: 'Cidade da turma' },
                    { v: '{{UF}}', d: 'Estado (UF dinâmica)' },
                    { v: '{{DATA_EXTENSO}}', d: 'Data por extenso' },
                    { v: '{{TURMA}}', d: 'ID da turma' },
                    { v: '{{CODIGO_VERIFICACAO}}', d: 'Código UPG-...' },
                ].map(item => (
                    <div key={item.v} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '6px 8px' }}>
                        <code className="mono" style={{ fontSize: '0.7rem', color: '#0F172A', fontWeight: 700 }}>{item.v}</code>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 2 }}>{item.d}</div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 6, fontSize: '0.74rem', color: '#475569' }}>
                💡 Use <code className="mono" style={{ fontSize: '0.7rem' }}>**texto**</code> para deixar em <strong>negrito</strong>.
                Ex: <code className="mono" style={{ fontSize: '0.7rem' }}>{'**{{ALUNO_NOME}}** concluiu o curso de **{{CURSO}}**'}</code>
            </div>
        </>
    ),
},
{
    num: '4',
    color: '#8B5CF6',
    title: 'Como pré-visualizar com dados reais',
    body: (
        <>
            1. Vá à aba <strong>Elegíveis</strong> e clique em <strong>👁️ Pré-visualizar PDF</strong> num aluno.
            O PDF baixa para o seu computador com os dados reais já preenchidos — <em>sem emitir</em> o certificado.<br/>
            2. Ou, dentro do editor, selecione o aluno na lista de teste e clique em <strong>📄 Ver PDF Final</strong>.
            Esse modal mostra o PDF final com todos os textos e variáveis já preenchidos.
        </>
    ),
},
{
    num: '5',
    color: '#EF4444',
    title: 'Como emitir um certificado de verdade',
    body: (
        <>
            Na aba <strong>Elegíveis</strong>, clique em <strong>🎓 Emitir Certificado</strong>.
            O aluno precisa ter <strong>frequência ≥ 75%</strong>. O sistema gera um código único{' '}
            <code className="mono" style={{ fontSize: '0.7rem', background: '#FEF3C7', padding: '1px 5px', borderRadius: 4 }}>UPG-...</code>,
            gera o PDF, guarda-o no sistema e envia notificação ao aluno.
            Depois disso, o aluno aparece na aba <strong>Histórico</strong> e o certificado pode ser{' '}
            <strong>verificado publicamente</strong> via QR Code (sem login).
        </>
    ),
},
];

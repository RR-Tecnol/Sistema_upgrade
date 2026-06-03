'use client';

import { useEffect, useState } from 'react';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { fabricacaoApi, BomTemplate } from '@/lib/api/fabricacao';

export default function BomTemplatesPage() {
  const [templates, setTemplates] = useState<BomTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fabricacaoApi.bom.templates().then(setTemplates).catch(() => {}).finally(() => setLoading(false)); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }} className="animate-fade-in">
      <AdminHeaderHero title="TEMPLATES BOM" subtitle="Bill of Materials — modelos de insumos por configuração" />

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF' }}>Carregando templates...</div>
      ) : templates.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '64px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: 4 }}>Nenhum template criado</div>
          <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Crie templates de BOM para agilizar a configuração de novas ordens de fabricação</div>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          {templates.map((t, idx) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', borderBottom: idx < templates.length - 1 ? '1px solid #F9FAFB' : 'none', flexWrap: 'wrap', borderLeft: `3px solid ${t.ativo ? '#059669' : '#E5E7EB'}`, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', fontFamily: 'Inter, sans-serif' }}>{t.nome}</span>
                  <span style={{ background: t.ativo ? '#F0FDF4' : '#F3F4F6', color: t.ativo ? '#059669' : '#9CA3AF', border: `1px solid ${t.ativo ? '#BBF7D0' : '#E5E7EB'}`, borderRadius: 20, padding: '2px 10px', fontSize: '0.62rem', fontWeight: 800 }}>
                    {t.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>
                {t.descricao && <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>{t.descricao}</div>}
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Configuração</div>
                  <div style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 800, color: '#B89B00', fontSize: '0.78rem' }}>{t.configuracao}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Versão</div>
                  <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.82rem' }}>v{t.versao}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Criado em</div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

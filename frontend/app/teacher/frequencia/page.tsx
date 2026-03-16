'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api/client';

import { ChevronRightIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export default function TeacherFrequencia() {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [attendanceToday, setAttendanceToday] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadClasses();
    }, []);

    async function loadClasses() {
        try {
            const res = await api.get('/classes');
            const list = Array.isArray(res.data) ? res.data : [];
            setClasses(list);

            // Verificar quais turmas já têm frequência registrada hoje
            const today = new Date().toISOString().split('T')[0];
            const checks: Record<string, boolean> = {};
            await Promise.all(
                list.map(async (cls: any) => {
                    try {
                        const attRes = await api.get(`/classes/${cls.id}/statistics`);
                        // Se foi registrada hoje, marcar como done
                        checks[cls.id] = false; // simplificado — sem endpoint específico por data
                    } catch {
                        checks[cls.id] = false;
                    }
                })
            );
            setAttendanceToday(checks);
        } catch {
            setClasses([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F1F5F9', fontFamily: 'Orbitron, sans-serif' }}>
                    FREQUÊNCIA
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: 4 }}>
                    Selecione a turma para registrar a frequência de hoje
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>Carregando turmas...</div>
            ) : classes.length === 0 ? (
                <div style={{
                    background: '#1E293B', borderRadius: 12, padding: '3rem',
                    textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)'
                }}>
                    <ClipboardDocumentCheckIcon style={{ width: 48, height: 48, color: '#334155', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Nenhuma turma encontrada</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {classes.map((cls) => {
                        const done = attendanceToday[cls.id];
                        return (
                            <Link key={cls.id} href={`/teacher/frequencia/${cls.id}`} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#1E293B', borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    padding: '1rem 1.25rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    cursor: 'pointer', transition: 'all 0.18s',
                                    minHeight: 72,
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.92rem', marginBottom: 4 }}>
                                            {cls.course?.name || 'Curso'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                                            {cls.city?.name} · {cls.classIdentifier}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                                            background: done ? 'rgba(16,185,129,0.15)' : 'rgba(255,214,0,0.12)',
                                            color: done ? '#10B981' : '#FFD600',
                                            border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : 'rgba(255,214,0,0.25)'}`,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {done ? '✓ Registrada hoje' : '⏳ Pendente'}
                                        </span>
                                        <ChevronRightIcon style={{ width: 16, height: 16, color: '#475569' }} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

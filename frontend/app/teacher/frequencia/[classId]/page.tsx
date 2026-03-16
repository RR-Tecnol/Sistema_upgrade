'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api/client';

import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Student {
    id: string;
    name: string;
    cpf?: string;
    photoUrl?: string;
}

interface AttendanceRecord {
    studentId: string;
    present: boolean;
}

export default function TeacherFrequenciaClass({ params }: { params: Promise<{ classId: string }> }) {
    const { classId } = use(params);
    const router = useRouter();
    const [classData, setClassData] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [records, setRecords] = useState<Record<string, boolean>>({});
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadClass();
    }, [classId]);

    async function loadClass() {
        try {
            const res = await api.get(`/classes/${classId}`);
            setClassData(res.data);
            const enrolled = (res.data.enrollments || [])
                .filter((e: any) => e.status === 'ENROLLED' || e.status === 'APPROVED')
                .map((e: any) => ({
                    id: e.student?.id || e.studentId,
                    name: e.student?.user?.name || 'Aluno',
                    cpf: e.student?.cpf,
                }));
            setStudents(enrolled);
            // Todos presentes por padrão
            const initial: Record<string, boolean> = {};
            enrolled.forEach((s: Student) => { initial[s.id] = true; });
            setRecords(initial);
        } catch {
            setStudents([]);
        } finally {
            setLoading(false);
        }
    }

    function toggleStudent(studentId: string) {
        setRecords(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    }

    function markAll(present: boolean) {
        const updated: Record<string, boolean> = {};
        students.forEach(s => { updated[s.id] = present; });
        setRecords(updated);
    }

    async function handleSave() {
        if (students.length === 0) {
            showToast('Nenhum aluno para registrar.', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                date,
                records: students.map(s => ({ studentId: s.id, present: records[s.id] ?? true })),
            };
            await api.post(`/classes/${classId}/attendance/bulk`, payload);
            showToast(`Frequência de ${students.length} alunos salva com sucesso!`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Erro ao salvar frequência.', 'error');
        } finally {
            setSaving(false);
        }
    }

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }

    const presentCount = students.filter(s => records[s.id]).length;
    const absentCount = students.length - presentCount;

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                Carregando turma...
            </div>
        );
    }

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    background: toast.type === 'success' ? '#10B981' : '#EF4444',
                    color: '#fff', padding: '0.75rem 1.25rem', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', marginBottom: '0.75rem', padding: 0 }}>
                    <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Voltar
                </button>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F1F5F9', fontFamily: 'Orbitron, sans-serif' }}>
                    {classData?.course?.name || 'Turma'}
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: 2 }}>
                    {classData?.city?.name} — {classData?.city?.state} · {classData?.classIdentifier}
                </p>
            </div>

            {/* Seletor de data + Resumo */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data da Aula</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{
                            background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, padding: '0.5rem 0.75rem', color: '#F1F5F9',
                            fontSize: '0.9rem', cursor: 'pointer', minHeight: 44,
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 20 }}>
                    <span style={{ fontSize: '0.82rem', color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                        {presentCount} P
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#EF4444', background: 'rgba(239,68,68,0.12)', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                        {absentCount} F
                    </span>
                </div>
            </div>

            {/* Ações em lote */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button onClick={() => markAll(true)} style={{
                    padding: '0.4rem 1rem', borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.1)', color: '#10B981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}>
                    Todos Presentes
                </button>
                <button onClick={() => markAll(false)} style={{
                    padding: '0.4rem 1rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}>
                    Todos Ausentes
                </button>
            </div>

            {/* Lista de alunos */}
            {students.length === 0 ? (
                <div style={{ background: '#1E293B', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#64748B', border: '1px solid rgba(255,255,255,0.06)' }}>
                    Nenhum aluno matriculado nesta turma.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '5rem' }}>
                    {students.map((student, idx) => {
                        const isPresent = records[student.id] ?? true;
                        return (
                            <div key={student.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#1E293B', borderRadius: 10,
                                border: `1px solid ${isPresent ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                padding: '0.75rem 1rem', transition: 'all 0.18s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: isPresent ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700,
                                        color: isPresent ? '#10B981' : '#EF4444', flexShrink: 0,
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.88rem' }}>{student.name}</div>
                                        {student.cpf && <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{student.cpf}</div>}
                                    </div>
                                </div>

                                {/* Toggle P / F — mínimo 44px de altura */}
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button
                                        onClick={() => setRecords(prev => ({ ...prev, [student.id]: true }))}
                                        style={{
                                            minWidth: 52, minHeight: 44, borderRadius: 8,
                                            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                                            background: isPresent ? '#10B981' : 'rgba(255,255,255,0.05)',
                                            color: isPresent ? '#fff' : '#64748B',
                                            transition: 'all 0.18s',
                                        }}
                                    >P</button>
                                    <button
                                        onClick={() => setRecords(prev => ({ ...prev, [student.id]: false }))}
                                        style={{
                                            minWidth: 52, minHeight: 44, borderRadius: 8,
                                            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                                            background: !isPresent ? '#EF4444' : 'rgba(255,255,255,0.05)',
                                            color: !isPresent ? '#fff' : '#64748B',
                                            transition: 'all 0.18s',
                                        }}
                                    >F</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botão Salvar — fixo no bottom */}
            {students.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 240, right: 0,
                    padding: '1rem 1.5rem', background: '#0F172A',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            width: '100%', minHeight: 52, borderRadius: 10,
                            background: saving ? '#475569' : 'linear-gradient(135deg, #FFD600, #F59E0B)',
                            border: 'none', fontWeight: 700, fontSize: '1rem',
                            color: '#0F172A', cursor: saving ? 'not-allowed' : 'pointer',
                            fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.05em',
                            transition: 'all 0.2s',
                        }}
                    >
                        {saving ? 'SALVANDO...' : `SALVAR FREQUÊNCIA (${students.length} ALUNOS)`}
                    </button>
                </div>
            )}
        </div>
    );
}

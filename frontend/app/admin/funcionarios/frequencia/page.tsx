'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircleIcon, XCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';

interface Employee {
    id: string;
    name: string;
    role: string;
    department: string;
    active: boolean;
}

interface AttendanceRecord {
    employeeId: string;
    present: boolean;
    justified: boolean;
    justification?: string;
}

interface SavedRecord {
    employeeId: string;
    present: boolean;
    justified: boolean;
    employee: { id: string; name: string; role: string };
}

const ROLE_MAP: Record<string, string> = {
    INSTRUCTOR: 'Instrutor', COORDINATOR: 'Coordenador',
    DRIVER: 'Motorista', TECHNICIAN: 'Técnico', ADMIN: 'Admin', OTHER: 'Outro',
};
const DEPT_MAP: Record<string, string> = {
    TEACHING: 'Ensino', LOGISTICS: 'Logística',
    ADMINISTRATIVE: 'Administrativo', TECHNICAL: 'Técnico',
};

export default function EmployeeFrequencia() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
    const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Carrega funcionários ativos
    useEffect(() => {
        api.get('/employees?active=true')
            .then(r => setEmployees(Array.isArray(r.data) ? r.data.filter((e: Employee) => e.active) : []))
            .catch(() => setEmployees([]));
    }, []);

    // Carrega frequência já registrada ao mudar data
    const loadAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get(`/employees/attendance?date=${selectedDate}`);
            const existing: SavedRecord[] = Array.isArray(r.data) ? r.data : [];
            setSavedRecords(existing);
            // Pré-preenche os registros locais com os dados salvos
            const preloaded: Record<string, AttendanceRecord> = {};
            existing.forEach(s => {
                preloaded[s.employeeId] = { employeeId: s.employeeId, present: s.present, justified: s.justified };
            });
            setRecords(preloaded);
            setIsEditing(existing.length > 0);
        } catch {
            setSavedRecords([]); setRecords({});
        } finally { setLoading(false); }
    }, [selectedDate]);

    useEffect(() => { loadAttendance(); }, [loadAttendance]);

    const toggle = (empId: string, present: boolean) => {
        setRecords(prev => ({ ...prev, [empId]: { employeeId: empId, present, justified: false } }));
    };

    const handleSave = async () => {
        const toSave = employees.map(e => ({
            employeeId: e.id,
            present: records[e.id]?.present ?? true,
            justified: records[e.id]?.justified ?? false,
        }));
        setSaving(true);
        try {
            await api.post('/employees/attendance', { date: selectedDate, records: toSave });
            setSaved(true); setTimeout(() => setSaved(false), 2500);
            setIsEditing(true);
            loadAttendance();
            toast.success('Frequência salva com sucesso!');
        } catch { toast.error('Erro ao salvar frequência.'); }
        finally { setSaving(false); }
    };

    const presentCount = employees.filter(e => records[e.id]?.present === true ||
        (records[e.id] === undefined)).length;
    const absentCount = employees.filter(e => records[e.id]?.present === false).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'Orbitron', fontSize: '2rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>FREQUÊNCIA</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Registro de presença diária dos funcionários</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        style={{ padding: '0.45rem 0.75rem', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.85rem', cursor: 'pointer' }} />
                    {isEditing && (
                        <span style={{ padding: '0.3rem 0.75rem', borderRadius: 20, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', fontSize: '0.7rem', fontWeight: 700 }}>✏️ Editando</span>
                    )}
                    {saved && (
                        <span style={{ padding: '0.3rem 0.75rem', borderRadius: 20, background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#059669', fontSize: '0.7rem', fontWeight: 700 }}>✅ Salvo!</span>
                    )}
                    <button onClick={handleSave} disabled={saving || employees.length === 0} className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: saving ? 0.7 : 1 }}>
                        {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, boxShadow: 'none' }} /> Salvando...</> : '💾 Salvar Frequência'}
                    </button>
                </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
                {[
                    { label: 'Total', value: employees.length, color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', icon: <UserGroupIcon style={{ width: 20, height: 20 }} /> },
                    { label: 'Presentes', value: presentCount, color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircleIcon style={{ width: 20, height: 20 }} /> },
                    { label: 'Ausentes', value: absentCount, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: <XCircleIcon style={{ width: 20, height: 20 }} /> },
                ].map(s => (
                    <div key={s.label} style={{ padding: '1rem', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: s.color }}>{s.icon}</div>
                        <div>
                            <div style={{ fontFamily: 'Orbitron', fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: s.color, opacity: 0.75 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabela de funcionários */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>CARREGANDO...</p>
                    </div>
                ) : employees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <UserGroupIcon style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 1rem' }} />
                        <p style={{ fontFamily: 'Orbitron', fontSize: '0.7rem', letterSpacing: '0.15em', color: '#9CA3AF' }}>NENHUM FUNCIONÁRIO ATIVO</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#FFFDE7', borderBottom: '2px solid #FEF08A' }}>
                                {['Funcionário', 'Cargo', 'Departamento', 'Presença'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B89B00' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, i) => {
                                const rec = records[emp.id];
                                const isPresent = rec?.present !== false; // default presente
                                const isAbsent = rec?.present === false;
                                return (
                                    <tr key={emp.id} className="animate-fade-in" style={{ animationDelay: `${i * 20}ms`, borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{emp.name}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6B7280' }}>{ROLE_MAP[emp.role] ?? emp.role}</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#6B7280' }}>{DEPT_MAP[emp.department] ?? emp.department}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => toggle(emp.id, true)} style={{ minHeight: 44, minWidth: 80, padding: '0.4rem 0.9rem', borderRadius: 9, border: `2px solid ${isPresent ? '#059669' : '#E5E7EB'}`, background: isPresent ? '#DCFCE7' : '#F9FAFB', color: isPresent ? '#059669' : '#9CA3AF', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    ✓ Presente
                                                </button>
                                                <button onClick={() => toggle(emp.id, false)} style={{ minHeight: 44, minWidth: 80, padding: '0.4rem 0.9rem', borderRadius: 9, border: `2px solid ${isAbsent ? '#DC2626' : '#E5E7EB'}`, background: isAbsent ? '#FEF2F2' : '#F9FAFB', color: isAbsent ? '#DC2626' : '#9CA3AF', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                                                    ✕ Falta
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

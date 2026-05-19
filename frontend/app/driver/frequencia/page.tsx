'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from '@/components/ui/Toast';
import {
    MapPinIcon,
    ClockIcon,
    CalendarDaysIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';

interface Checkin {
    id: string;
    checkedAt: string;
    checkoutAt?: string | null; // MEL-07
    date: string;
    note?: string;
}

export default function DriverFrequencia() {
    const { user } = useAuthStore();
    const [checkins, setCheckins] = useState<Checkin[]>([]);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [note, setNote] = useState('');
    const [checkingOut, setCheckingOut] = useState(false); // MEL-07

    const today = new Date().toISOString().split('T')[0];
    const todayCheckin = checkins.find(c => c.date === today);
    const hasCheckedInToday = !!todayCheckin;
    const hasCheckedOutToday = !!todayCheckin?.checkoutAt; // MEL-07

    useEffect(() => {
        if (user) loadCheckins();
    }, [user]);

    const loadCheckins = async () => {
        try {
            const res = await api.get('/users/me/driver-checkins');
            setCheckins(res.data);
        } catch {
            setCheckins([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckin = async () => {
        if (hasCheckedInToday || checkingIn) {
            if (hasCheckedInToday) toast.error('Você já bateu o ponto hoje!');
            return;
        }
        if (!navigator.geolocation) {
            toast.error('Geolocalização não suportada pelo seu navegador');
            return;
        }

        setCheckingIn(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await api.post('/users/me/driver-checkin', {
                        note: note.trim() || undefined
                    });
                    if (res.data.alreadyRegistered) {
                        toast.error('Você já bateu o ponto hoje!');
                    } else {
                        toast.success('Ponto registrado com sucesso!');
                        setNote('');
                        loadCheckins();
                    }
                } catch (e: any) {
                    toast.error(e.response?.data?.message || 'Erro ao registrar ponto');
                } finally {
                    setCheckingIn(false);
                }
            },
            (err) => {
                toast.error('Permissão de localização negada ou erro ao buscar posição.');
                setCheckingIn(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // MEL-07: registrar saída do motorista
    const handleCheckout = async () => {
        if (!hasCheckedInToday || hasCheckedOutToday || checkingOut) return;
        setCheckingOut(true);
        try {
            const res = await api.post('/users/me/driver-checkout');
            if (res.data?.alreadyRegistered) {
                toast.error('Saída já registrada hoje!');
            } else {
                toast.success('Saída registrada com sucesso!');
                loadCheckins();
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Erro ao registrar saída');
        } finally {
            setCheckingOut(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <AdminHeaderHero
                title="MEU PONTO"
                subtitle="Registro diário e histórico de presença do motorista"
                badge="MOTORISTA"
            />

            {/* Checkin Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 transition-transform"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <ClockIcon className="w-5 h-5 text-blue-600" />
                            Registro Diário
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Bata seu ponto diário para confirmar sua presença e ativar o monitoramento de rota.
                        </p>
                        
                        {hasCheckedInToday && (
                            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 w-fit">
                                <CheckCircleIcon className="w-5 h-5" />
                                Ponto de hoje registrado
                            </div>
                        )}
                    </div>

                    {!hasCheckedInToday && (
                        <div className="w-full md:w-auto flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="Observação (opcional)"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="input-field text-sm"
                            />
                            <button 
                                onClick={handleCheckin} 
                                disabled={checkingIn}
                                className="btn-primary whitespace-nowrap justify-center"
                            >
                                <MapPinIcon className="w-5 h-5 mr-1" />
                                {checkingIn ? 'Registrando...' : 'Bater Ponto Agora'}
                            </button>
                        </div>
                    )}

                    {/* MEL-07: Botão de saída — aparece quando check-in feito e saída não registrada */}
                    {hasCheckedInToday && !hasCheckedOutToday && (
                        <button
                            onClick={handleCheckout}
                            disabled={checkingOut}
                            className="btn-secondary whitespace-nowrap justify-center"
                            style={{ borderColor: '#F59E0B', color: '#92400E', background: '#FFF7ED' }}
                        >
                            <ClockIcon className="w-5 h-5 mr-1" />
                            {checkingOut ? 'Registrando...' : '🕒 Bater Saída'}
                        </button>
                    )}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Histórico de Ponto</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saída</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                                        Carregando histórico...
                                    </td>
                                </tr>
                            ) : checkins.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500 flex flex-col items-center">
                                        <ClockIcon className="w-10 h-10 text-gray-400 mb-2" />
                                        Você ainda não bateu o ponto nenhuma vez.
                                    </td>
                                </tr>
                            ) : (
                                checkins.map(checkin => (
                                    <tr key={checkin.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {new Date(checkin.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(checkin.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {checkin.checkoutAt
                                                ? new Date(checkin.checkoutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                                : <span className="text-gray-400 text-xs">Não registrada</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                Presente
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

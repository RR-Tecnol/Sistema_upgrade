'use client';

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api/client';
import { toast } from '@/components/ui/Toast';
import { customConfirm } from '@/components/ui/ConfirmModal';

interface AdminOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    employeeId: string;
    attendanceId: string | null;
    date: string;
    currentPresent: boolean | null;
    onSuccess: () => void;
}

export default function AdminOverrideModal({
    isOpen, onClose, employeeName, employeeId, attendanceId, date, currentPresent, onSuccess
}: AdminOverrideModalProps) {
    const [present, setPresent] = useState<boolean>(currentPresent ?? true);
    const [reason, setReason] = useState('');
    const [notifyUser, setNotifyUser] = useState(true);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!reason || reason.trim().length < 5) {
            toast.error('Informe um motivo válido para a alteração (mín. 5 caracteres).');
            return;
        }
        const today = new Date().toISOString().slice(0, 10);
        if (date < today) {
            const ok = await customConfirm({
                title: 'Confirmar alteração retroativa',
                message: `Você está alterando ponto em ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}. Deseja realmente prosseguir?`,
                confirmLabel: 'Sim, alterar',
                cancelLabel: 'Cancelar',
            });
            if (!ok) return;
        }

        setSaving(true);
        try {
            await api.patch(`/employees/attendance/${employeeId}/admin-override`, {
                present,
                reason: reason.trim(),
                notifyUser
            }, {
                params: { date, attendanceId }
            });
            toast.success('Ponto alterado com sucesso.');
            if (notifyUser) {
                toast.success('Usuário notificado.');
            }
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Erro ao alterar ponto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Alterar Ponto
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4 rounded flex items-start gap-2">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-amber-700 m-0 leading-tight">
                                        Você está prestes a alterar manualmente o ponto de <strong>{employeeName}</strong>.
                                        Esta ação ficará registrada no histórico.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Novo Status</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPresent(true)}
                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                                    present 
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                Presente
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPresent(false)}
                                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                                    !present 
                                                    ? 'bg-red-50 border-red-500 text-red-700' 
                                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                Falta
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Motivo da Alteração <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={3}
                                            placeholder="Ex: Falha no GPS, atestado apresentado..."
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        />
                                    </div>

                                    <div className="flex items-center mt-2">
                                        <input
                                            id="notifyUser"
                                            type="checkbox"
                                            checked={notifyUser}
                                            onChange={(e) => setNotifyUser(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="notifyUser" className="ml-2 block text-sm text-gray-900">
                                            Enviar notificação ao funcionário
                                        </label>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={onClose}
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? 'Salvando...' : 'Confirmar Alteração'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

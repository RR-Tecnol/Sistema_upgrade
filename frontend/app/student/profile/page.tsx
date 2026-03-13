'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import {
    UserIcon,
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    KeyIcon,
} from '@heroicons/react/24/outline';

interface StudentProfile {
    id: string;
    cpf: string;
    rg: string;
    birthDate: string;
    gender: string;
    user: {
        name: string;
        email: string;
        phone: string;
    };
    contact: {
        email: string;
        phone: string;
        phoneAlt?: string;
    };
    address: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        state: string;
        cep: string;
    };
}

export default function StudentProfile() {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/students/me');
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('As senhas não coincidem');
            return;
        }

        try {
            await api.patch('/students/me/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });

            alert('Senha alterada com sucesso!');
            setShowPasswordForm(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Erro ao alterar senha. Verifique a senha atual.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!profile) {
        return <div className="p-6">Perfil não encontrado</div>;
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
                <p className="text-gray-600">Visualize e gerencie suas informações pessoais</p>
            </div>

            {/* Personal Data */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <UserIcon className="w-6 h-6" />
                    Dados Pessoais
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-600">Nome Completo</label>
                        <p className="font-medium text-gray-900">{profile.user.name}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">CPF</label>
                        <p className="font-medium text-gray-900">{profile.cpf}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">RG</label>
                        <p className="font-medium text-gray-900">{profile.rg}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Data de Nascimento</label>
                        <p className="font-medium text-gray-900">
                            {new Date(profile.birthDate).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Gênero</label>
                        <p className="font-medium text-gray-900">{profile.gender}</p>
                    </div>
                </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <EnvelopeIcon className="w-6 h-6" />
                    Contato
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-600">E-mail</label>
                        <p className="font-medium text-gray-900">{profile.contact.email}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Telefone</label>
                        <p className="font-medium text-gray-900">{profile.contact.phone}</p>
                    </div>
                    {profile.contact.phoneAlt && (
                        <div>
                            <label className="text-sm text-gray-600">Telefone Alternativo</label>
                            <p className="font-medium text-gray-900">{profile.contact.phoneAlt}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-6 h-6" />
                    Endereço
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-sm text-gray-600">Rua</label>
                        <p className="font-medium text-gray-900">
                            {profile.address.street}, {profile.address.number}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Bairro</label>
                        <p className="font-medium text-gray-900">{profile.address.neighborhood}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">CEP</label>
                        <p className="font-medium text-gray-900">{profile.address.cep}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Cidade</label>
                        <p className="font-medium text-gray-900">{profile.address.city}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600">Estado</label>
                        <p className="font-medium text-gray-900">{profile.address.state}</p>
                    </div>
                </div>
            </div>

            {/* Password Change */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <KeyIcon className="w-6 h-6" />
                    Segurança
                </h2>

                {!showPasswordForm ? (
                    <button
                        onClick={() => setShowPasswordForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Alterar Senha
                    </button>
                ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Senha Atual
                            </label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nova Senha
                            </label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirmar Nova Senha
                            </label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Salvar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPasswordForm(false);
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

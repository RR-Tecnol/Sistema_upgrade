'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { DocumentTextIcon, EyeIcon } from '@heroicons/react/24/outline';

interface Enrollment {
    id: string;
    protocol: string;
    status: string;
    createdAt: string;
    class: {
        name: string;
        course: {
            name: string;
        };
        city: {
            name: string;
        };
    };
}

export default function StudentEnrollments() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            const response = await api.get('/students/me/enrollments');
            setEnrollments(response.data);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            APPROVED: 'bg-green-100 text-green-800 border-green-300',
            REJECTED: 'bg-red-100 text-red-800 border-red-300',
            ENROLLED: 'bg-blue-100 text-blue-800 border-blue-300',
            WAITLIST: 'bg-purple-100 text-purple-800 border-purple-300',
        };

        const labels = {
            PENDING: 'Pendente',
            APPROVED: 'Aprovado',
            REJECTED: 'Rejeitado',
            ENROLLED: 'Matriculado',
            WAITLIST: 'Lista de Espera',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    const filteredEnrollments = enrollments.filter((enrollment) => {
        if (filter === 'ALL') return true;
        return enrollment.status === filter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Inscrições</h1>
                <p className="text-gray-600">Acompanhe o status de todas as suas inscrições</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex gap-2 flex-wrap">
                    {['ALL', 'PENDING', 'APPROVED', 'ENROLLED', 'REJECTED', 'WAITLIST'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'ALL' ? 'Todos' : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Enrollments List */}
            <div className="space-y-4">
                {filteredEnrollments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">Nenhuma inscrição encontrada</p>
                    </div>
                ) : (
                    filteredEnrollments.map((enrollment) => (
                        <div
                            key={enrollment.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {enrollment.class.course.name}
                                        </h3>
                                        {getStatusBadge(enrollment.status)}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <strong>Turma:</strong> {enrollment.class.name}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <strong>Local:</strong> {enrollment.class.city.name}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <strong>Protocolo:</strong> {enrollment.protocol}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <strong>Data:</strong>{' '}
                                        {new Date(enrollment.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <EyeIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

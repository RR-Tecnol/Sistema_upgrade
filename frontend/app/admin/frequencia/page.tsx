'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AcademicCapIcon, TruckIcon, UsersIcon } from '@heroicons/react/24/outline';
import EmployeeFrequencyTab from './components/EmployeeFrequencyTab';
import StudentFrequencyTab from './components/StudentFrequencyTab';
import AdminHeaderHero from '@/components/admin/AdminHeaderHero';
import { FrequenciaSidebarTutorial } from '@/components/admin/adminSidebarTutorials';

type TabType = 'professores' | 'motoristas' | 'alunos';

export default function FrequenciaUnifiedPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const tabParam = searchParams.get('tab') as TabType;
    
    const [activeTab, setActiveTab] = useState<TabType>(
        ['professores', 'motoristas', 'alunos'].includes(tabParam) ? tabParam : 'professores'
    );

    // Sync state with URL
    useEffect(() => {
        if (['professores', 'motoristas', 'alunos'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(pathname + '?' + params.toString(), { scroll: false });
    };

    return (
        <div className="space-y-6">
            <AdminHeaderHero
                title="CENTRAL DE FREQUÊNCIA"
                subtitle="Lançamento diário e visão individual: use o filtro e clique no nome (professores, motoristas ou alunos) para ver histórico completo e cadastro"
            />
            <FrequenciaSidebarTutorial />

            {/* Tabs */}
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => handleTabChange('professores')}
                    className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === 'professores'
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                >
                    <AcademicCapIcon className={`w-5 h-5 ${activeTab === 'professores' ? 'text-blue-600' : 'text-gray-400'}`} />
                    Professores
                </button>
                <button
                    onClick={() => handleTabChange('motoristas')}
                    className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === 'motoristas'
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                >
                    <TruckIcon className={`w-5 h-5 ${activeTab === 'motoristas' ? 'text-blue-600' : 'text-gray-400'}`} />
                    Motoristas
                </button>
                <button
                    onClick={() => handleTabChange('alunos')}
                    className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === 'alunos'
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                >
                    <UsersIcon className={`w-5 h-5 ${activeTab === 'alunos' ? 'text-blue-600' : 'text-gray-400'}`} />
                    Alunos
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'professores' && <EmployeeFrequencyTab role="TEACHER" />}
                {activeTab === 'motoristas' && <EmployeeFrequencyTab role="DRIVER" />}
                {activeTab === 'alunos' && <StudentFrequencyTab />}
            </div>
        </div>
    );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    Gender,
    RaceColor,
    MaritalStatus,
    EducationLevel,
    EmploymentStatus,
    FamilyIncome,
    Zone,
    CareerGoal,
    SocialProgram,
    DisabilityType,
} from '@/lib/enums';

// Step 1: Personal Data
export interface PersonalDataForm {
    fullName: string;
    socialName?: string;
    cpf: string;
    birthDate: string;
    gender: Gender | '';
    raceColor: RaceColor | '';
    maritalStatus: MaritalStatus | '';
    motherName: string;
    fatherName?: string;
    nationality: string;
    birthCity: string;
    birthState: string;
    // Credenciais de acesso (criadas junto com o cadastro)
    password: string;
    confirmPassword: string;
}

// Step 2: Contact
export interface ContactForm {
    email: string;
    phone: string;
    hasWhatsApp: boolean;
    phoneAlt?: string;
    allowWhatsAppContact: boolean;
    allowEmailContact: boolean;
}

// Step 3: Address
export interface AddressForm {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zone: Zone | '';
}

// Step 4: Socioeconomic
export interface SocioeconomicForm {
    educationLevel: EducationLevel | '';
    employmentStatus: EmploymentStatus | '';
    familyIncome: FamilyIncome | '';
    familyMembersCount: number;
    socialProgram?: SocialProgram;
    publicSchoolOnly?: boolean;  // REQ-03: critério de elegibilidade governamental
    hasDisability: boolean;
    disabilityType?: DisabilityType;
    disabilityAdaptation?: boolean;
}

// Step 5: Professional
export interface ProfessionalForm {
    previousQualification?: string;
    professionalInterest?: string;
    careerGoal: CareerGoal | '';
    howHeardAbout?: string;
    motivation?: string;  // REQ-05: opcional
}

// Step 6: Documents (indexável para pré-visualização / payload JSON)
export type DocumentsForm = Partial<Record<string, string>> & {
    photo?: string;
    identidade?: string;
    cpfDoc?: string;
    addressProof?: string;
    educationProof?: string;
};

// Step 7: Terms
export interface TermsForm {
    termsAccepted: boolean;
    imageUseAuthorization: boolean;
    attendanceCommitment: boolean;
    dataProcessingConsent: boolean;
}

interface EnrollmentState {
    classId: string;
    currentStep: number;
    formData: {
        personalData: Partial<PersonalDataForm>;
        contact: Partial<ContactForm>;
        address: Partial<AddressForm>;
        socioeconomic: Partial<SocioeconomicForm>;
        professional: Partial<ProfessionalForm>;
        documents: DocumentsForm;
        terms: Partial<TermsForm>;
    };

    // Actions
    setClassId: (classId: string) => void;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    updatePersonalData: (data: Partial<PersonalDataForm>) => void;
    updateContact: (data: Partial<ContactForm>) => void;
    updateAddress: (data: Partial<AddressForm>) => void;
    updateSocioeconomic: (data: Partial<SocioeconomicForm>) => void;
    updateProfessional: (data: Partial<ProfessionalForm>) => void;
    updateDocuments: (data: Partial<DocumentsForm>) => void;
    updateTerms: (data: Partial<TermsForm>) => void;
    reset: () => void;
}

/** Persistência: não gravar senhas no localStorage. */
function formDataForPersist(formData: EnrollmentState['formData']): EnrollmentState['formData'] {
    const { password: _pw, confirmPassword: _cp, ...restPersonal } = formData.personalData;
    return {
        ...formData,
        personalData: { ...restPersonal },
    };
}

const initialState = {
    classId: '',
    currentStep: 1,
    formData: {
        personalData: {},
        contact: {
            hasWhatsApp: true,
            allowWhatsAppContact: true,
            allowEmailContact: true,
        },
        address: {},
        socioeconomic: {
            familyMembersCount: 1,
            hasDisability: false,
        },
        professional: {},
        documents: {},
        terms: {
            termsAccepted: false,
            imageUseAuthorization: false,
            attendanceCommitment: false,
            dataProcessingConsent: false,
        },
    },
};

export const useEnrollmentStore = create<EnrollmentState>()(
    persist(
        (set) => ({
            ...initialState,

            setClassId: (classId) => set({ classId }),

            setStep: (step) => set({ currentStep: step }),

            nextStep: () => set((state) => ({
                currentStep: Math.min(state.currentStep + 1, 8),
            })),

            prevStep: () => set((state) => ({
                currentStep: Math.max(state.currentStep - 1, 1),
            })),

            updatePersonalData: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    personalData: { ...state.formData.personalData, ...data },
                },
            })),

            updateContact: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    contact: { ...state.formData.contact, ...data },
                },
            })),

            updateAddress: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    address: { ...state.formData.address, ...data },
                },
            })),

            updateSocioeconomic: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    socioeconomic: { ...state.formData.socioeconomic, ...data },
                },
            })),

            updateProfessional: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    professional: { ...state.formData.professional, ...data },
                },
            })),

            updateDocuments: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    documents: { ...state.formData.documents, ...data },
                },
            })),

            updateTerms: (data) => set((state) => ({
                formData: {
                    ...state.formData,
                    terms: { ...state.formData.terms, ...data },
                },
            })),

            reset: () => set(initialState),
        }),
        {
            name: 'enrollment-storage-v3',
            partialize: (state) => ({
                classId: state.classId,
                currentStep: state.currentStep,
                formData: formDataForPersist(state.formData),
            }),
        }
    )
);

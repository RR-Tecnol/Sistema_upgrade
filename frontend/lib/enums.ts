/**
 * Enums locais que espelham os enums do schema Prisma no backend.
 * ⚠️ CRÍTICO: Os valores DEVEM ser idênticos aos do schema.prisma.
 * Qualquer divergência causa erro 400 na API de inscrição.
 */

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
    PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum RaceColor {
    WHITE = 'WHITE',
    BLACK = 'BLACK',
    BROWN = 'BROWN',
    YELLOW = 'YELLOW',
    INDIGENOUS = 'INDIGENOUS',
    NOT_DECLARED = 'NOT_DECLARED',
}

export enum MaritalStatus {
    SINGLE = 'SINGLE',
    MARRIED = 'MARRIED',
    DIVORCED = 'DIVORCED',
    WIDOWED = 'WIDOWED',
    STABLE_UNION = 'STABLE_UNION',
}

export enum Zone {
    URBAN = 'URBAN',
    RURAL = 'RURAL',
}

// ⚠️ Valores exactos do Prisma schema — NÃO alterar sem sincronizar o backend
export enum EducationLevel {
    NO_FORMAL_EDUCATION = 'NO_FORMAL_EDUCATION',
    ELEMENTARY_INCOMPLETE = 'ELEMENTARY_INCOMPLETE',
    ELEMENTARY_COMPLETE = 'ELEMENTARY_COMPLETE',
    HIGH_SCHOOL_INCOMPLETE = 'HIGH_SCHOOL_INCOMPLETE',
    HIGH_SCHOOL_COMPLETE = 'HIGH_SCHOOL_COMPLETE',
    HIGHER_INCOMPLETE = 'HIGHER_INCOMPLETE',
    HIGHER_COMPLETE = 'HIGHER_COMPLETE',
    POSTGRADUATE = 'POSTGRADUATE',
}

// ⚠️ Valores exactos do Prisma schema — NÃO alterar sem sincronizar o backend
export enum EmploymentStatus {
    EMPLOYED_CLT = 'EMPLOYED_CLT',
    EMPLOYED_PJ = 'EMPLOYED_PJ',
    SELF_EMPLOYED = 'SELF_EMPLOYED',
    UNEMPLOYED = 'UNEMPLOYED',
    STUDENT = 'STUDENT',
    HOMEMAKER = 'HOMEMAKER',
    RETIRED = 'RETIRED',
    OTHER = 'OTHER',
}

// ⚠️ Valores exactos do Prisma schema — NÃO alterar sem sincronizar o backend
export enum FamilyIncome {
    UP_TO_1_MW = 'UP_TO_1_MW',
    FROM_1_TO_2_MW = 'FROM_1_TO_2_MW',
    FROM_2_TO_3_MW = 'FROM_2_TO_3_MW',
    FROM_3_TO_5_MW = 'FROM_3_TO_5_MW',
    ABOVE_5_MW = 'ABOVE_5_MW',
    PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum SocialProgram {
    BOLSA_FAMILIA = 'BOLSA_FAMILIA',
    BPC = 'BPC',
    AUXILIO_BRASIL = 'AUXILIO_BRASIL',
    PE_DE_MEIA = 'PE_DE_MEIA',
    OTHER = 'OTHER',
}

export enum DisabilityType {
    VISUAL = 'VISUAL',
    HEARING = 'HEARING',
    PHYSICAL = 'PHYSICAL',
    INTELLECTUAL = 'INTELLECTUAL',
    MULTIPLE = 'MULTIPLE',
    OTHER = 'OTHER',
}

export enum CareerGoal {
    EMPLOYMENT = 'EMPLOYMENT',
    OWN_BUSINESS = 'OWN_BUSINESS',
    ENTREPRENEURSHIP = 'ENTREPRENEURSHIP',
    CAREER_CHANGE = 'CAREER_CHANGE',
    PROFESSIONAL_DEVELOPMENT = 'PROFESSIONAL_DEVELOPMENT',
    OTHER = 'OTHER',
}

/**
 * Enums locais que espelham os enums do schema Prisma no backend.
 * Usados no frontend para evitar dependência direta do @prisma/client.
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

export enum EducationLevel {
    NO_EDUCATION = 'NO_EDUCATION',
    ELEMENTARY_INCOMPLETE = 'ELEMENTARY_INCOMPLETE',
    ELEMENTARY_COMPLETE = 'ELEMENTARY_COMPLETE',
    HIGH_SCHOOL_INCOMPLETE = 'HIGH_SCHOOL_INCOMPLETE',
    HIGH_SCHOOL_COMPLETE = 'HIGH_SCHOOL_COMPLETE',
    TECHNICAL = 'TECHNICAL',
    HIGHER_INCOMPLETE = 'HIGHER_INCOMPLETE',
    HIGHER_COMPLETE = 'HIGHER_COMPLETE',
    POSTGRADUATE = 'POSTGRADUATE',
}

export enum EmploymentStatus {
    EMPLOYED = 'EMPLOYED',
    UNEMPLOYED = 'UNEMPLOYED',
    SELF_EMPLOYED = 'SELF_EMPLOYED',
    STUDENT = 'STUDENT',
    RETIRED = 'RETIRED',
    OTHER = 'OTHER',
}

export enum FamilyIncome {
    UP_TO_1_MINIMUM = 'UP_TO_1_MINIMUM',
    FROM_1_TO_2_MINIMUM = 'FROM_1_TO_2_MINIMUM',
    FROM_2_TO_3_MINIMUM = 'FROM_2_TO_3_MINIMUM',
    FROM_3_TO_5_MINIMUM = 'FROM_3_TO_5_MINIMUM',
    ABOVE_5_MINIMUM = 'ABOVE_5_MINIMUM',
}

export enum SocialProgram {
    BOLSA_FAMILIA = 'BOLSA_FAMILIA',
    BPC = 'BPC',
    AUXILIO_BRASIL = 'AUXILIO_BRASIL',
    NONE = 'NONE',
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
    CAREER_CHANGE = 'CAREER_CHANGE',
    PROFESSIONAL_DEVELOPMENT = 'PROFESSIONAL_DEVELOPMENT',
    OTHER = 'OTHER',
}

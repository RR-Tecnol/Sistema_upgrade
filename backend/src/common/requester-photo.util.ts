import { resolveStoredMediaUrl } from './resolve-stored-media-url.util';

/** Foto do solicitante: Employee (cadastro) ou Teacher (instrutor). */
export function resolveRequesterPhotoUrl(input: {
    employeePhotoUrl?: string | null;
    teacherPhotoUrl?: string | null;
}): string | null {
    const raw = input.employeePhotoUrl || input.teacherPhotoUrl;
    if (!raw?.trim()) return null;
    return resolveStoredMediaUrl(raw) ?? raw.trim();
}

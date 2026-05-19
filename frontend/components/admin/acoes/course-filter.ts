/** Cursos disponíveis no estado do grupo (MA / PI). */
export function filterCoursesByGroupState<T extends { availableInMA?: boolean; availableInPI?: boolean }>(
    courses: T[],
    groupState: string | undefined | null,
): T[] {
    const uf = (groupState || '').trim().toUpperCase().slice(0, 2);
    if (uf === 'MA') return courses.filter(c => c.availableInMA);
    if (uf === 'PI') return courses.filter(c => c.availableInPI);
    return courses;
}

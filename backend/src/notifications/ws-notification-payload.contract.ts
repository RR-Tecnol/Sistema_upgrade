/**
 * Contrato único para payloads de notificação via WebSocket (namespace /notifications).
 *
 * - actorName: pessoa que executou a ação administrativa (revisor, professor no lançamento, etc.).
 * - Campos legacy (reviewedByName, adminName, …) são aceitos nos emissores e normalizados
 *   pelo NotificationsGateway antes do emit — evita regressões em clientes antigos.
 *
 * Não usar studentName/driverName aqui como ator — são sujeitos do evento.
 */
export const WS_ACTOR_LEGACY_KEYS = [
    'reviewedByName',
    'adminName',
    'approverName',
    'registeredByName',
    'reviewerName',
    /** Em eventos onde o professor é quem registra/atua (ex.: frequência, alerta). */
    'teacherName',
] as const;

export type WsPayloadRecord = Record<string, unknown>;

export function coerceActorNameFromLegacyPayload(payload: WsPayloadRecord): string | undefined {
    const direct = payload.actorName;
    if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();
    for (const key of WS_ACTOR_LEGACY_KEYS) {
        const v = payload[key];
        if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return undefined;
}

/** Garante `actorName` coerente no payload antes do emit WS. Preserva todos os outros campos. */
export function withNormalizedActorWsPayload(data: unknown): unknown {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const payload = { ...(data as WsPayloadRecord) };
    const coerced = coerceActorNameFromLegacyPayload(payload);
    if (coerced) payload.actorName = coerced;
    return payload;
}

import { z } from 'zod';

/**
 * Sincronização em lote: ou lista de IDs, ou toda a turma (`classId`), não ambos.
 */
export const certificateBulkSyncBodySchema = z
  .object({
    certificateIds: z.array(z.string().uuid()).min(1).max(2000).optional(),
    classId: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      Boolean(d.certificateIds && d.certificateIds.length > 0) !== Boolean(d.classId) &&
      (Boolean(d.certificateIds && d.certificateIds.length) || Boolean(d.classId)),
    { message: 'Indique exatamente um: certificateIds (1–2000) ou classId' },
  );

export type CertificateBulkSyncBody = z.infer<typeof certificateBulkSyncBodySchema>;

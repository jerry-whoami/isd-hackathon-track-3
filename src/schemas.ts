import { z } from 'zod';

export const documentTypeSchema = z.enum(['propuesta', 'carta_origen_fondos']);
export const topicSchema = z.enum(['PAYMENT_TERMS', 'LIABILITY', 'DECLARED_BO', 'JURISDICTIONS']);
export const primitiveSchema = z.enum([
  'structural',
  'provenance',
  'list_membership',
  'threshold',
  'mandatory_presence'
]);
export const severitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const jurisdictionSchema = z.object({
  jurisdiction: z.string(),
  aliases: z.array(z.string())
}).strict();

export const policySectionSchema = z.object({
  id: z.string(),
  applies_to: z.array(documentTypeSchema),
  topic: topicSchema,
  finding_type: z.string().nullable(),
  primitive: primitiveSchema,
  params: z.record(z.string(), z.unknown()),
  severity: severitySchema,
  mandatory: z.boolean(),
  confidential: z.boolean(),
  provenance: z.literal('TRUSTED').default('TRUSTED'),
  source: z.string(),
  text: z.string(),
  reason: z.string().optional(),
  high_risk_jurisdictions: z.array(jurisdictionSchema).optional()
}).strict();

export const policyCorpusSchema = z.object({
  sections: z.array(policySectionSchema)
}).strict();

export const anchorSchema = z.object({
  start: z.int().nonnegative(),
  end: z.int().nonnegative()
}).strict();

export const paymentClaimSchema = z.object({
  found: z.boolean(),
  days: z.int().min(0).max(365).optional(),
  anchor: anchorSchema.optional()
}).strict();

export const liabilityCapClaimSchema = z.discriminatedUnion('found', [
  z.object({
    found: z.literal(true),
    cap_percent: z.int().min(0).max(1000),
    anchor: anchorSchema
  }).strict(),
  z.object({
    found: z.literal(false)
  }).strict()
]);

export const plannerToolSchemas = {
  approve_submission: z.object({}).strict(),
  route_to_human: z.object({
    finding_ids: z.array(z.string()),
    reason: z.string()
  }).strict(),
  quarantine_submission: z.object({
    reason: z.string()
  }).strict()
} as const;

export type DocumentType = z.infer<typeof documentTypeSchema>;
export type PolicySection = z.infer<typeof policySectionSchema>;
export type PolicyCorpus = z.infer<typeof policyCorpusSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type PaymentClaim = z.infer<typeof paymentClaimSchema>;
export type LiabilityCapClaim = z.infer<typeof liabilityCapClaimSchema>;

export function jsonGrammar(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
}

export function coverageSchema(topics: readonly Topic[]) {
  return z.object({
    topic: z.enum([...topics, 'NONE'] as unknown as [string, ...string[]])
  }).strict();
}

const plannerToolDescriptions = {
  approve_submission: 'Aprueba la propuesta.',
  route_to_human: 'Envía la propuesta a una persona para revisión.',
  quarantine_submission: 'Pone la propuesta en cuarentena.'
} as const;

export function plannerTools() {
  return Object.entries(plannerToolSchemas).map(([name, parameters]) => ({
    name: name as keyof typeof plannerToolSchemas,
    description: plannerToolDescriptions[name as keyof typeof plannerToolDescriptions],
    parameters
  }));
}

import type { PolicySection } from './schemas.ts';

export type VerificationStatus = 'verified' | 'corrected' | 'unverified' | 'missing';
export type ValidationPrimitive = 'structural' | 'provenance' | 'threshold' | 'mandatory_presence';

export const recipeTable: Record<string, ValidationPrimitive[]> = {
  PAYMENT_TERMS_CONFLICT: ['structural', 'provenance', 'threshold', 'mandatory_presence']
};

export type PaymentValidation = {
  status: VerificationStatus;
  span?: { id: string; start: number; end: number };
  finding?: { actual: number; maximum: number };
  failClosedReason?: string;
  recipe: ValidationPrimitive[];
};

export function validatePaymentClaim(input: {
  policy: PolicySection;
  extractedText: string;
  found: boolean;
  days?: number;
  span?: { id: string; start: number; end: number };
}): PaymentValidation {
  const recipe = recipeTable[input.policy.finding_type ?? ''] ?? [];
  const maximum = input.policy.params.max_days;
  if (typeof maximum !== 'number') throw new Error(`Policy ${input.policy.id} has no numeric max_days.`);

  if (!input.found || input.days === undefined || !input.span) {
    return {
      status: 'missing',
      failClosedReason: 'no se encontró el plazo de pago',
      recipe
    };
  }

  const structural = Number.isInteger(input.days) && input.days >= 0 && input.days <= 365 && input.span.start <= input.span.end;
  const pointedText = input.extractedText.slice(input.span.start, input.span.end);
  const provenance = input.span.start >= 0 && input.span.end <= input.extractedText.length && pointedText.length > 0;
  const valueIsInText = new RegExp(`(?<!\\d)${input.days}(?!\\d)`).test(pointedText);
  if (!structural || !provenance || !valueIsInText) {
    return { status: 'unverified', span: input.span, failClosedReason: 'el plazo de pago no pudo verificarse en el texto', recipe };
  }

  return input.days > maximum
    ? { status: 'verified', span: input.span, finding: { actual: input.days, maximum }, recipe }
    : { status: 'verified', span: input.span, recipe };
}

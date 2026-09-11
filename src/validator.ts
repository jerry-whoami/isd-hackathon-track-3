import type { PolicySection } from './schemas.ts';

export type VerificationStatus = 'verified' | 'corrected' | 'unverified' | 'missing';
export type ValidationPrimitive = 'structural' | 'provenance' | 'list_membership' | 'threshold' | 'mandatory_presence';

export const recipeTable: Record<string, ValidationPrimitive[]> = {
  PAYMENT_TERMS_CONFLICT: ['structural', 'provenance', 'threshold', 'mandatory_presence'],
  UBO_MISMATCH: ['structural', 'provenance', 'threshold', 'mandatory_presence']
};

export type PaymentValidation = {
  status: VerificationStatus;
  span?: { id: string; start: number; end: number };
  finding?: { actual: number; maximum: number };
  failClosedReason?: string;
  recipe: ValidationPrimitive[];
};

export type HoldingValidation = {
  status: VerificationStatus;
  failClosedReason?: string;
  recipe: ValidationPrimitive[];
};

export const corporateShareholderSuffixes = ['S.A.', 'Ltd.', 'Inc.', 'Corp.', 'Fundación'] as const;

export function isCorporateShareholder(name: string): boolean {
  return corporateShareholderSuffixes.some((suffix) => name.endsWith(suffix));
}

export function validateCorporateShareholder(input: {
  policy: PolicySection;
  row: { id: string; name: string };
  percent: number;
}): { failClosedReason?: string } {
  const minimum = input.policy.params.min_percent;
  if (typeof minimum !== 'number') throw new Error(`Policy ${input.policy.id} has no numeric min_percent.`);
  return isCorporateShareholder(input.row.name) && input.percent >= minimum
    ? { failClosedReason: `${input.row.id} es un accionista corporativo con ${input.percent}%; su beneficiario final requiere revisión humana` }
    : {};
}

export function validateUboMismatch(input: {
  policy: PolicySection;
  row: { id: string; name: string };
  percent: number;
  declaredPartyId?: string;
}): { finding?: { actual: number; minimum: number } } {
  const minimum = input.policy.params.min_percent;
  if (typeof minimum !== 'number') throw new Error(`Policy ${input.policy.id} has no numeric min_percent.`);
  if (isCorporateShareholder(input.row.name) || input.percent < minimum || input.row.id === input.declaredPartyId) return {};
  return { finding: { actual: input.percent, minimum } };
}

export function validateDeclaredBeneficialOwner(input: {
  policy: PolicySection;
  sentence?: string;
  row?: { id: string; name: string };
  declared: string;
}): HoldingValidation {
  const recipe: ValidationPrimitive[] = ['structural', 'provenance', 'mandatory_presence'];
  if (input.declared === 'NINGUNO' || !input.sentence || !input.row) {
    return { status: 'missing', failClosedReason: 'no se encontró una declaración de beneficiario final', recipe };
  }
  return input.sentence.includes(input.row.name)
    ? { status: 'verified', recipe }
    : { status: 'unverified', failClosedReason: `la declaración de beneficiario final no pudo verificarse para ${input.row.id}`, recipe };
}

export function validateHoldingClaim(input: {
  policy: PolicySection;
  row: { id: string; text: string };
  percent?: number;
}): HoldingValidation {
  const recipe = recipeTable[input.policy.finding_type ?? ''] ?? [];
  if (input.percent === undefined) {
    return { status: 'missing', failClosedReason: `no se encontró la participación accionaria de ${input.row.id}`, recipe };
  }
  const structural = Number.isInteger(input.percent) && input.percent >= 0 && input.percent <= 100;
  const valueIsInRow = new RegExp(`(?<!\\d)${input.percent}(?!\\d)`).test(input.row.text);
  return structural && valueIsInRow
    ? { status: 'verified', recipe }
    : { status: 'unverified', failClosedReason: `la participación accionaria de ${input.row.id} no pudo verificarse en su fila`, recipe };
}

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

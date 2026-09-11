export const HOSTILE_INJECTIONS: {
  propuesta: string;
  carta_origen_fondos: string;
};

export function escapeInjection(injection: string): string;
export function renderDocument(type: 'propuesta' | 'carta_origen_fondos', injection?: string): string;
export function renderAttackDocument(type: 'propuesta' | 'carta_origen_fondos', escapedInjection: string): string;

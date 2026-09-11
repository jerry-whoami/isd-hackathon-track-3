import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import type { GrammarRequest, ModelPort, ToolCall, ToolRequest } from './model-port.ts';

const messageSchema = z.object({
  role: z.enum(['system', 'user']),
  content: z.string()
}).strict();

const requestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('Reader'), messages: z.array(messageSchema), grammar: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ kind: z.literal('Planner'), messages: z.array(messageSchema) }).strict()
]);

const envelopeSchema = z.object({
  id: z.string().uuid(),
  request: requestSchema
}).strict();

const responseSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), result: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: z.string() }).strict()
]);

export type FileDropRequest = z.infer<typeof envelopeSchema>;
export type FileDropResponse = z.infer<typeof responseSchema>;

export class FileDropModelAdapter implements ModelPort {
  constructor(
    private readonly jobsDirectory = process.env.FARADAY_JOBS_DIR ?? '/work/jobs',
    private readonly timeoutMs = Number.parseInt(process.env.FARADAY_INFERENCE_TIMEOUT_MS ?? '120000', 10)
  ) {}

  async grammar(request: GrammarRequest): Promise<unknown> {
    return this.call({ kind: 'Reader', messages: request.messages, grammar: request.grammar });
  }

  async tools(request: ToolRequest): Promise<{ toolCalls: ToolCall[] }> {
    const result = await this.call({ kind: 'Planner', messages: request.messages });
    return parseToolResponse(result);
  }

  private async call(request: FileDropRequest['request']): Promise<unknown> {
    const id = randomUUID();
    const directory = path.join(this.jobsDirectory, id);
    await mkdir(directory, { recursive: true });
    const envelope = JSON.stringify({ id, request });
    const temporaryRequest = path.join(directory, 'request.json.tmp');
    const requestPath = path.join(directory, 'request.json');
    await writeFile(temporaryRequest, envelope);
    await rename(temporaryRequest, requestPath);
    const responsePath = path.join(directory, 'response.json');
    const deadline = Date.now() + this.timeoutMs;
    while (Date.now() < deadline) {
      try {
        await access(responsePath);
        const response = responseSchema.parse(JSON.parse(await readFile(responsePath, 'utf8')));
        if (!response.ok) throw new Error(`Inference rejected request: ${response.error}`);
        return response.result;
      } catch (error) {
        if (isMissingFile(error)) {
          await wait(50);
          continue;
        }
        throw new Error(`Malformed inference response: ${errorMessage(error)}`);
      }
    }
    throw new Error(`Inference timed out after ${this.timeoutMs}ms.`);
  }
}

export function parseFileDropRequest(value: unknown): FileDropRequest {
  return envelopeSchema.parse(value);
}

export function serializeFileDropResponse(response: FileDropResponse): string {
  return JSON.stringify(response);
}

function parseToolResponse(value: unknown): { toolCalls: ToolCall[] } {
  const parsed = z.object({
    toolCalls: z.array(z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) }).strict())
  }).strict().parse(value);
  return { toolCalls: parsed.toolCalls };
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

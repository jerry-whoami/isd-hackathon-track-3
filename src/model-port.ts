import { jsonGrammar } from './schemas.ts';

export type Message = { role: 'system' | 'user'; content: string };
export type ToolDefinition = ReturnType<typeof import('./schemas.ts').plannerTools>[number];
export type ToolCall = { name: string; arguments: Record<string, unknown> };

export type GrammarRequest = {
  kind: 'Reader';
  messages: Message[];
  grammar: Record<string, unknown>;
};

export type ToolRequest = {
  kind: 'Planner';
  messages: Message[];
  tools: ToolDefinition[];
};

export type ModelRequest = GrammarRequest | ToolRequest;

export interface ModelPort {
  grammar(request: GrammarRequest): Promise<unknown>;
  tools(request: ToolRequest): Promise<{ toolCalls: ToolCall[] }>;
}

export class ScriptedModelAdapter implements ModelPort {
  readonly requests: ModelRequest[] = [];
  private readonly responses: unknown[];

  constructor(responses: unknown[]) {
    this.responses = [...responses];
  }

  async grammar(request: GrammarRequest): Promise<unknown> {
    this.requests.push(request);
    return this.next();
  }

  async tools(request: ToolRequest): Promise<{ toolCalls: ToolCall[] }> {
    this.requests.push(request);
    const response = this.next();
    if (!isObject(response) || !Array.isArray(response.toolCalls)) {
      throw new Error('Scripted Planner response must contain toolCalls.');
    }
    return { toolCalls: response.toolCalls.map(parseToolCall) };
  }

  private next(): unknown {
    const response = this.responses.shift();
    if (response === undefined) throw new Error('Scripted model has no response for request.');
    return response;
  }
}

export class QvacModelAdapter implements ModelPort {
  private constructor(private readonly sdk: QvacSdk, private readonly modelId: string) {}

  static async load(modelPath = process.env.FARADAY_MODEL ?? '/models/Qwen3-8B-Q4_K_M.gguf'): Promise<QvacModelAdapter> {
    const sdk = await import('@qvac/sdk') as unknown as QvacSdk;
    const modelId = await sdk.loadModel({
      modelSrc: modelPath,
      modelType: 'llamacpp-completion',
      modelConfig: { ctx_size: 8192, tools: true }
    });
    return new QvacModelAdapter(sdk, modelId);
  }

  async close(): Promise<void> {
    await this.sdk.unloadModel({ modelId: this.modelId, clearStorage: false });
  }

  async grammar(request: GrammarRequest): Promise<unknown> {
    const run = this.sdk.completion({
      modelId: this.modelId,
      history: request.messages,
      stream: true,
      responseFormat: { type: 'json_schema', json_schema: { name: 'reader_output', schema: request.grammar } },
      generationParams: { reasoning_budget: 0 }
    });
    for await (const _event of run.events) {
      // QVAC must be drained before its final result is available.
    }
    const final = await run.final;
    return JSON.parse(final.contentText);
  }

  async tools(request: ToolRequest): Promise<{ toolCalls: ToolCall[] }> {
    const run = this.sdk.completion({
      modelId: this.modelId,
      history: request.messages,
      stream: true,
      tools: request.tools,
      generationParams: { reasoning_budget: 0 }
    });
    for await (const _event of run.events) {
      // QVAC must be drained before its tool calls are available.
    }
    return { toolCalls: (await run.toolCalls).map((call) => parseToolCall(call)) };
  }
}

type QvacRun = {
  events: AsyncIterable<unknown>;
  final: Promise<{ contentText: string }>;
  toolCalls: Promise<unknown[]>;
};

type QvacSdk = {
  loadModel(input: { modelSrc: string; modelType: string; modelConfig: { ctx_size: number; tools: boolean } }): Promise<string>;
  unloadModel(input: { modelId: string; clearStorage: boolean }): Promise<void>;
  completion(input: Record<string, unknown>): QvacRun;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseToolCall(value: unknown): ToolCall {
  if (!isObject(value)) throw new Error('Invalid tool call.');
  const candidate = isObject(value.function)
    ? { name: value.function.name, arguments: value.function.arguments }
    : { name: value.name, arguments: value.arguments };
  if (typeof candidate.name !== 'string') throw new Error('Tool call has no name.');
  const argumentsValue = typeof candidate.arguments === 'string'
    ? JSON.parse(candidate.arguments)
    : candidate.arguments;
  if (!isObject(argumentsValue)) throw new Error('Tool call arguments must be an object.');
  return { name: candidate.name, arguments: argumentsValue };
}

export { jsonGrammar };

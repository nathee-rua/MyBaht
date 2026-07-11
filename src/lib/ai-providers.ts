import type { AIProvider, AIProviderConfig, AIModel, SlipAnalysisResult } from '@/types';

// ===== Provider Configurations =====

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelsEndpoint: '/models',
    keyPrefix: 'sk-',
    icon: '🤖',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: '/models',
    keyPrefix: 'sk-or-',
    icon: '🔀',
  },
  {
    id: 'google',
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelsEndpoint: '/models',
    keyPrefix: 'AI',
    icon: '💎',
  },
  {
    id: 'grok',
    name: 'Grok',
    baseUrl: 'https://api.x.ai/v1',
    modelsEndpoint: '/models',
    keyPrefix: 'xai-',
    icon: '⚡',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    modelsEndpoint: '/models',
    keyPrefix: 'nvapi-',
    icon: '🟢',
  },
  {
    id: 'opencode',
    name: 'OpenCode Zen',
    baseUrl: 'https://console.opencode.ai/inference/openai/v1',
    modelsEndpoint: '/models',
    keyPrefix: '',
    icon: '🧘',
  },
  {
    id: 'llm7',
    name: 'LLM7.io',
    baseUrl: 'https://api.llm7.io/v1',
    modelsEndpoint: '/models',
    keyPrefix: '',
    icon: '7️⃣',
  },
];

export function getProviderConfig(providerId: AIProvider): AIProviderConfig {
  const config = AI_PROVIDERS.find((p) => p.id === providerId);
  if (!config) throw new Error(`Unknown AI provider: ${providerId}`);
  return config;
}

// ===== Key Validation =====

export function keyIssue(provider: AIProvider, key: string): string | null {
  const config = getProviderConfig(provider);
  if (!key || key.trim().length === 0) {
    return 'API key is required';
  }
  if (!key.startsWith(config.keyPrefix)) {
    return `Key should start with "${config.keyPrefix}" for ${config.name}`;
  }
  if (key.length < 10) {
    return 'API key seems too short';
  }
  return null;
}

// ===== Fetch Models =====

const VISION_KEYWORDS = [
  'vision', 'gpt-4o', 'gpt-4-turbo', 'gpt-4.1', 'gpt-4.5', 'gpt-4o-mini',
  'o1', 'o3', 'o4-mini',
  'gemini', 'gemini-1.5', 'gemini-2', 'gemini-pro-vision',
  'claude-3', 'claude-3.5', 'claude-3.7', 'claude-4',
  'llava', 'qwen-vl', 'qwen2-vl', 'qwen-2.5-vl', 'qwen2.5-vl',
  'pixtral', 'mistral-large',
  'grok-vision', 'grok-2-vision', 'grok-2', 'grok-3',
  'llama-3.2', 'llama-4',
  'deepseek',
  'gemma',
];

function isVisionModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return VISION_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function fetchModels(
  provider: AIProvider,
  apiKey: string
): Promise<AIModel[]> {
  const config = getProviderConfig(provider);

  if (provider === 'google') {
    return fetchGeminiModels(apiKey);
  }

  const response = await fetch(`${config.baseUrl}${config.modelsEndpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter' && {
        'HTTP-Referer': 'https://mybaht.app',
        'X-Title': 'MyBaht',
      }),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch models: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const models: AIModel[] = (data.data || [])
    .map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || m.id,
      supportsVision: isVisionModel(m.id),
    }))
    .filter((m: AIModel) => m.supportsVision)
    .sort((a: AIModel, b: AIModel) => a.name.localeCompare(b.name));

  return models;
}

async function fetchGeminiModels(apiKey: string): Promise<AIModel[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch Gemini models: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const models: AIModel[] = (data.models || [])
    .filter((m: { supportedGenerationMethods?: string[]; name?: string }) => {
      const methods = m.supportedGenerationMethods || [];
      return methods.includes('generateContent');
    })
    .map((m: { name?: string; displayName?: string }) => {
      const id = (m.name || '').replace('models/', '');
      return {
        id,
        name: m.displayName || id,
        supportsVision: isVisionModel(id),
      };
    })
    .filter((m: AIModel) => m.supportsVision)
    .sort((a: AIModel, b: AIModel) => a.name.localeCompare(b.name));

  return models;
}

// ===== Analyze Slip =====

const SLIP_ANALYSIS_PROMPT = `You are analyzing a receipt/payment slip image. Extract the following information and return ONLY valid JSON:
{
  "amount": <number - the total amount paid>,
  "category": "<one of: food, transport, shopping, bills, entertainment, health, education, other>",
  "merchant": "<store/merchant name if visible>",
  "note": "<brief description of the transaction>",
  "date": "<date in YYYY-MM-DD format, use today if not visible>",
  "payment_method": "<one of: cash, bank, credit_card, e_wallet, savings>"
}

Rules:
- Extract the TOTAL/GRAND TOTAL amount, not subtotals
- If currency is THB/Baht, use that amount directly
- If the date is not clearly visible, use today's date
- Category should match the type of purchase
- For payment method, look for card numbers, QR codes, bank logos, etc.
- Return ONLY the JSON object, no markdown, no explanation`;

export async function analyzeSlip(
  provider: AIProvider,
  apiKey: string,
  model: string,
  imageBase64: string
): Promise<SlipAnalysisResult> {
  const config = getProviderConfig(provider);

  let result: string;

  if (provider === 'google') {
    result = await analyzeWithGemini(apiKey, model, imageBase64);
  } else {
    result = await analyzeWithOpenAICompatible(config, apiKey, model, imageBase64);
  }

  // Parse the JSON response
  const cleaned = result
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      amount: Number(parsed.amount) || 0,
      category: parsed.category || 'other',
      merchant: parsed.merchant || '',
      note: parsed.note || '',
      date: parsed.date || new Date().toISOString().split('T')[0],
      payment_method: parsed.payment_method || 'cash',
    };
  } catch {
    throw new Error('Failed to parse AI response. The model did not return valid JSON.');
  }
}

// ===== Analyze SMS/Alert Text =====

const TEXT_ANALYSIS_PROMPT = `You are analyzing a payment notification text, SMS, LINE Alert, or bank transaction message. Extract the following information and return ONLY valid JSON:
{
  "amount": <number - the total amount paid>,
  "category": "<one of: food, transport, shopping, bills, entertainment, health, education, other>",
  "merchant": "<store/merchant name if found in text>",
  "note": "<brief description of the transaction>",
  "date": "<date in YYYY-MM-DD format, use today if not visible/parseable>",
  "payment_method": "<one of: cash, bank, credit_card, e_wallet, savings>"
}

Rules:
- Extract the total transaction amount as a float/number.
- Try to infer the merchant/shop name from context (e.g. "Starbucks", "7-Eleven", "Grab", "Shopee", bank transfers).
- In Thailand, bank alerts from K-Plus, SCB Easy, LINE alerts, or SMS alerts are common. Extract date/time from the alert context.
- If the date is not found or is in relative terms, use today's date in YYYY-MM-DD.
- Return ONLY the JSON object, no markdown code blocks, no explanation.`;

export async function analyzeText(
  provider: AIProvider,
  apiKey: string,
  model: string,
  text: string
): Promise<SlipAnalysisResult> {
  const config = getProviderConfig(provider);

  let result: string;

  if (provider === 'google') {
    result = await analyzeTextWithGemini(apiKey, model, text);
  } else {
    result = await analyzeTextWithOpenAICompatible(config, apiKey, model, text);
  }

  // Parse the JSON response
  const cleaned = result
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      amount: Number(parsed.amount) || 0,
      category: parsed.category || 'other',
      merchant: parsed.merchant || '',
      note: parsed.note || '',
      date: parsed.date || new Date().toISOString().split('T')[0],
      payment_method: parsed.payment_method || 'cash',
    };
  } catch {
    throw new Error('Failed to parse AI response. The model did not return valid JSON.');
  }
}

async function analyzeTextWithOpenAICompatible(
  config: AIProviderConfig,
  apiKey: string,
  model: string,
  text: string
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(config.id === 'openrouter' && {
        'HTTP-Referer': 'https://mybaht.app',
        'X-Title': 'MyBaht',
      }),
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: TEXT_ANALYSIS_PROMPT },
            { type: 'text', text: `Here is the transaction text/SMS/alert: "${text}"` }
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI text analysis failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function analyzeTextWithGemini(
  apiKey: string,
  model: string,
  text: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: TEXT_ANALYSIS_PROMPT },
              { text: `Here is the transaction text/SMS/alert: "${text}"` }
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini text analysis failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function analyzeWithOpenAICompatible(
  config: AIProviderConfig,
  apiKey: string,
  model: string,
  imageBase64: string
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(config.id === 'openrouter' && {
        'HTTP-Referer': 'https://mybaht.app',
        'X-Title': 'MyBaht',
      }),
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SLIP_ANALYSIS_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI analysis failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function analyzeWithGemini(
  apiKey: string,
  model: string,
  imageBase64: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SLIP_ANALYSIS_PROMPT },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini analysis failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ===== Test Connection =====

export async function testConnection(
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<{ success: boolean; message: string }> {
  try {
    const config = getProviderConfig(provider);

    if (provider === 'google') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with: OK' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
      }

      return { success: true, message: `Connected to ${config.name} (${model})` };
    }

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(provider === 'openrouter' && {
          'HTTP-Referer': 'https://mybaht.app',
          'X-Title': 'MyBaht',
        }),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with: OK' }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${response.status}: ${error}`);
    }

    return { success: true, message: `Connected to ${config.name} (${model})` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// ===== Encryption Helpers =====

export function encryptApiKey(key: string): string {
  // Simple XOR encryption with the ENCRYPTION_KEY env var
  const encKey = process.env.ENCRYPTION_KEY || 'default-key';
  let encrypted = '';
  for (let i = 0; i < key.length; i++) {
    const charCode = key.charCodeAt(i) ^ encKey.charCodeAt(i % encKey.length);
    encrypted += String.fromCharCode(charCode);
  }
  return Buffer.from(encrypted).toString('base64');
}

export function decryptApiKey(encrypted: string): string {
  const encKey = process.env.ENCRYPTION_KEY || 'default-key';
  const decoded = Buffer.from(encrypted, 'base64').toString();
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i) ^ encKey.charCodeAt(i % encKey.length);
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
}

// ===== Default Vision Models Fallbacks =====

export function getDefaultModels(provider: AIProvider): AIModel[] {
  switch (provider) {
    case 'openai':
      return [
        { id: 'gpt-4o', name: 'GPT-4o', supportsVision: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsVision: true },
        { id: 'o1', name: 'o1', supportsVision: true },
        { id: 'o3-mini', name: 'o3-mini', supportsVision: true },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', supportsVision: true },
      ];
    case 'openrouter':
      return [
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsVision: true },
        { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsVision: true },
        { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', supportsVision: true },
        { id: 'qwen/qwen-2.5-vl-72b-instruct', name: 'Qwen 2.5 VL 72B', supportsVision: true },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', supportsVision: true },
      ];
    case 'google':
      return [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', supportsVision: true },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', supportsVision: true },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', supportsVision: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', supportsVision: true },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp', supportsVision: true },
      ];
    case 'grok':
      return [
        { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', supportsVision: true },
        { id: 'grok-vision-beta', name: 'Grok Vision Beta', supportsVision: true },
        { id: 'grok-2-1212', name: 'Grok 2 Chat', supportsVision: true },
        { id: 'grok-beta', name: 'Grok Beta', supportsVision: true },
        { id: 'grok-3', name: 'Grok 3', supportsVision: true },
      ];
    case 'nvidia':
      return [
        { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', supportsVision: true },
        { id: 'nvidia/llama-3.2-11b-vision-instruct', name: 'NVIDIA Llama 3.2 11B', supportsVision: true },
        { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', supportsVision: true },
        { id: 'microsoft/phi-3-vision-128k-instruct', name: 'Phi-3 Vision', supportsVision: true },
        { id: 'google/deplot', name: 'Deplot Vision', supportsVision: true },
      ];
    case 'opencode':
      return [
        { id: 'opencode-zen-vl-7b', name: 'OpenCode Zen VL 7B', supportsVision: true },
        { id: 'opencode-zen-vl-34b', name: 'OpenCode Zen VL 34B', supportsVision: true },
        { id: 'qwen2.5-vl-7b', name: 'Qwen 2.5 VL 7B', supportsVision: true },
        { id: 'llama-3.2-11b-vision', name: 'Llama 3.2 11B Vision', supportsVision: true },
        { id: 'opencode-zen-vl-72b', name: 'OpenCode Zen VL 72B', supportsVision: true },
      ];
    case 'llm7':
      return [
        { id: 'llm7-vision-pro', name: 'LLM7 Vision Pro', supportsVision: true },
        { id: 'llm7-vision-lite', name: 'LLM7 Vision Lite', supportsVision: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (LLM7)', supportsVision: true },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (LLM7)', supportsVision: true },
        { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (LLM7)', supportsVision: true },
      ];
    default:
      return [];
  }
}

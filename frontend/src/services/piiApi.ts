const API_BASE_URL = 'http://localhost:8000';

export interface EntityInfo {
  entity_type: string;
  start: number;
  end: number;
  score: number;
  text: string;
}

export interface SanitizePayloadRequest {
  payload: any;
  language?: string;
}

export interface SanitizePayloadResponse {
  original: any;
  sanitized: any;
  entities: EntityInfo[];
}

export async function sanitizePayload(
  payload: any,
  language: string = 'en'
): Promise<SanitizePayloadResponse> {
  const response = await fetch(`${API_BASE_URL}/sanitize-payload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payload,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export async function analyzeText(text: string, language: string = 'en') {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export async function sanitizeText(text: string, language: string = 'en') {
  const response = await fetch(`${API_BASE_URL}/sanitize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  free: boolean;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  if (!apiKey) {
    throw new Error('API key required to fetch models');
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch models (${response.status}): ${errorText}`);
  }

  const data: OpenRouterModelsResponse = await response.json();

  // Filter and map to our format
  return data.data
    .filter(model => model.id) // Only include models with valid IDs
    .map(model => ({
      id: model.id,
      name: model.name || model.id,
      provider: model.provider || model.id.split('/')[0] || 'Unknown',
      free: model.pricing?.prompt === 0 && model.pricing?.completion === 0,
      description: `Context: ${model.context_length || 'N/A'} tokens`,
    }))
    .sort((a, b) => {
      // Sort: free first, then by provider
      if (a.free && !b.free) return -1;
      if (!a.free && b.free) return 1;
      return a.provider.localeCompare(b.provider);
    });
}

export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface UnmaskMappingRequest {
  text: string;
  mapping: Record<string, string>; // {ENTITY_TYPE: original_value}
}

export interface UnmaskMappingResponse {
  original: string;
  unmasked: string;
  replacements_count: number;
}

export async function unmaskWithMapping(
  text: string,
  mapping: Record<string, string>
): Promise<UnmaskMappingResponse> {
  const response = await fetch(`${API_BASE_URL}/unmask-with-mapping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      mapping,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

   return response.json();
 }

export async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[],
  language: string = 'en'
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please add your key in Settings.');
  }

  // Strict placeholder instruction - always use ENGLISH tokens
  const placeholderInstruction = `IMPORTANT: When you mention any personal information in your response, you MUST replace it with a placeholder using these EXACT strings (do NOT translate or modify them):
- [MASKED_PERSON] for person names
- [MASKED_EMAIL] for email addresses
- [MASKED_PHONE] for phone numbers
- [MASKED_ADDRESS] for physical addresses
- [MASKED_DATE] for dates
- [MASKED_IP_ADDRESS] for IP addresses
- [MASKED_SSN] for SSN
- [MASKED_CREDIT_CARD] for credit cards
- [MASKED_ORG] for organizations/companies

Example in English: "I contacted [MASKED_PERSON] at [MASKED_ORG]."
Example in Russian: "Я связался с [MASKED_PERSON] из [MASKED_ORG]."

NEVER write the actual personal data - always use placeholders.`;

  let langInstruction: string;
  switch (language) {
    case 'ru':
      langInstruction = 'Respond ONLY in Russian. Do not use any other language.';
      break;
    case 'mixed':
      langInstruction = 'You may respond in either English or Russian depending on context.';
      break;
    case 'en':
    default:
      langInstruction = 'Respond ONLY in English. Do not use any other language, even if the user message contains non-English text.';
  }

  const finalMessages = [
    {
      role: 'system' as const,
      content: `You are a helpful assistant. ${langInstruction}\n\n${placeholderInstruction}`
    },
    ...messages
  ];

  const fallbackModels = [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'mistralai/mistral-7b-instruct:free'
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'PrivacyGate AI',
        },
        body: JSON.stringify({
          model,
          messages: finalMessages,
        } as OpenRouterRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `OpenRouter API error (${response.status}): ${errorText}`;

        if (response.status === 503 || response.status === 429) {
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
            continue;
          }
          for (const fallbackModel of fallbackModels) {
            if (fallbackModel === model) continue;
            try {
              const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': window.location.origin,
                  'X-Title': 'PrivacyGate AI',
                },
                body: JSON.stringify({
                  model: fallbackModel,
                  messages: finalMessages,
                } as OpenRouterRequest),
              });

              if (fallbackResponse.ok) {
                const data: OpenRouterResponse = await fallbackResponse.json();
                return data.choices[0].message.content;
              }
            } catch (e) {
              continue;
            }
          }
        }

        throw new Error(errorMsg);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to get response from OpenRouter after retries');
}

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

export async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[]
): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Please add your key in Settings.');
  }

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
      messages,
    } as OpenRouterRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data: OpenRouterResponse = await response.json();
  return data.choices[0].message.content;
}

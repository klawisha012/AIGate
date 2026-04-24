// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isSanitized?: boolean;
  originalContent?: string;
}

// PII Entity types
export type PIIType = 'EMAIL' | 'PHONE' | 'ADDRESS' | 'PERSON' | 'SSN' | 'CREDIT_CARD' | 'DATE' | 'IP_ADDRESS';

export interface PIIEntity {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  maskedValue: string;
}

// Payload types
export interface Payload {
  session_id: string;
  data: {
    user?: string;
    location?: string;
    message: string;
    [key: string]: any;
  };
  metadata: {
    ip: string;
    client: string;
    timestamp?: string;
    [key: string]: any;
  };
}

// Session types
export interface Session {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Audit log types
export interface AuditLog {
  timestamp: string;
  event: string;
  status: string;
  details?: string;
}

// Detection config
export interface DetectionConfig {
  enableEmail: boolean;
  enablePhone: boolean;
  enableAddress: boolean;
  enablePerson: boolean;
  enableSSN: boolean;
  enableCreditCard: boolean;
  enableDate: boolean;
  enableIP: boolean;
}

// OpenRouter config
export interface OpenRouterConfig {
  apiKey: string;
  model: string;
}

// App state
export interface AppState {
  sessions: Session[];
  currentSessionId: string | null;
  isProcessing: boolean;
  auditLogs: AuditLog[];
  detectionConfig: DetectionConfig;
  terminalOpen: boolean;
  settingsOpen: boolean;
  inspectionPanelOpen: boolean;
  openRouterConfig: OpenRouterConfig;
}

export type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'CREATE_SESSION'; payload: Session }
  | { type: 'SET_CURRENT_SESSION'; payload: string }
  | { type: 'PURGE_SESSION' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'ADD_AUDIT_LOG'; payload: AuditLog }
  | { type: 'UPDATE_DETECTION_CONFIG'; payload: Partial<DetectionConfig> }
  | { type: 'UPDATE_OPENROUTER_CONFIG'; payload: Partial<OpenRouterConfig> }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'TOGGLE_INSPECTION_PANEL' };

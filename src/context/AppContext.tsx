import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, Action, Session } from '../types';
import { generateSessionId } from '../services/utils';

const loadFromStorage = (): Partial<AppState> => {
  try {
    const saved = localStorage.getItem('privacygate-state');
    if (saved) {
      const parsed = JSON.parse(saved);

      // Migrate old model IDs to valid ones
      let model = parsed.openRouterConfig?.model || 'google/gemini-2.0-flash-exp:free';
      // Fix old/invalid model IDs
      if (model.includes('deepseek') || model === 'openrouter/auto') {
        model = 'google/gemini-2.0-flash-exp:free';
        // Also clear the API key if using invalid model (force re-setup)
        // parsed.openRouterConfig.apiKey = '';
      }

      return {
        sessions: parsed.sessions || [],
        currentSessionId: parsed.currentSessionId || null,
        openRouterConfig: {
          apiKey: parsed.openRouterConfig?.apiKey || '',
          model: model,
        },
        detectionConfig: parsed.detectionConfig || {
          enableEmail: true,
          enablePhone: true,
          enableAddress: true,
          enablePerson: true,
          enableSSN: true,
          enableCreditCard: true,
          enableDate: true,
          enableIP: true,
        },
      };
    }
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
  }
  return {};
};

const saveToStorage = (state: AppState) => {
  try {
    const toSave = {
      sessions: state.sessions,
      currentSessionId: state.currentSessionId,
      openRouterConfig: state.openRouterConfig,
      detectionConfig: state.detectionConfig,
    };
    localStorage.setItem('privacygate-state', JSON.stringify(toSave));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
};

const initialState: AppState = {
  sessions: [],
  currentSessionId: null,
  isProcessing: false,
  auditLogs: [],
  detectionConfig: {
    enableEmail: true,
    enablePhone: true,
    enableAddress: true,
    enablePerson: true,
    enableSSN: true,
    enableCreditCard: true,
    enableDate: true,
    enableIP: true,
  },
  terminalOpen: false,
  settingsOpen: false,
  inspectionPanelOpen: false,
  openRouterConfig: {
    apiKey: '',
    model: 'google/gemini-2.0-flash-exp:free',
  },
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      if (!state.currentSessionId) {
        // Create new session if none exists
        const newSession: Session = {
          id: generateSessionId(),
          messages: [action.payload],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return {
          ...state,
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        };
      }

      const existingSessionIndex = state.sessions.findIndex(s => s.id === state.currentSessionId);
      if (existingSessionIndex === -1) return state;

      const updatedSession = {
        ...state.sessions[existingSessionIndex],
        messages: [...state.sessions[existingSessionIndex].messages, action.payload],
        updatedAt: Date.now(),
      };

      const newSessions = [...state.sessions];
      newSessions[existingSessionIndex] = updatedSession;

      return {
        ...state,
        sessions: newSessions,
      };

    case 'UPDATE_MESSAGE':
      const updateIndex = state.sessions.findIndex(s =>
        s.id === state.currentSessionId && s.messages.some(m => m.id === action.payload.id)
      );

      if (updateIndex === -1) return state;

      const sessionWithUpdate = state.sessions[updateIndex];
      const updatedMessages = sessionWithUpdate.messages.map(m =>
        m.id === action.payload.id ? { ...m, content: action.payload.content } : m
      );

      const updatedSessions = [...state.sessions];
      updatedSessions[updateIndex] = { ...sessionWithUpdate, messages: updatedMessages };

      return { ...state, sessions: updatedSessions };

    case 'CREATE_SESSION':
      return {
        ...state,
        sessions: [action.payload, ...state.sessions],
        currentSessionId: action.payload.id,
      };

    case 'SET_CURRENT_SESSION':
      return { ...state, currentSessionId: action.payload };

    case 'PURGE_SESSION':
      return {
        ...state,
        sessions: [],
        currentSessionId: null,
        auditLogs: [],
      };

    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };

    case 'ADD_AUDIT_LOG':
      return {
        ...state,
        auditLogs: [action.payload, ...state.auditLogs].slice(0, 50), // Keep last 50 logs
      };

    case 'UPDATE_DETECTION_CONFIG':
      return {
        ...state,
        detectionConfig: { ...state.detectionConfig, ...action.payload },
      };

    case 'UPDATE_OPENROUTER_CONFIG':
      return {
        ...state,
        openRouterConfig: { ...state.openRouterConfig, ...action.payload },
      };

    case 'TOGGLE_TERMINAL':
      return { ...state, terminalOpen: !state.terminalOpen };

    case 'TOGGLE_SETTINGS':
      return { ...state, settingsOpen: !state.settingsOpen };

    case 'TOGGLE_INSPECTION_PANEL':
      return { ...state, inspectionPanelOpen: !state.inspectionPanelOpen };

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  currentSession: Session | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState,
    (init) => ({
      ...init,
      ...loadFromStorage(),
    })
  );

  // Save state to localStorage on changes
  useEffect(() => {
    saveToStorage(state);
  }, [state.sessions, state.currentSessionId, state.openRouterConfig, state.detectionConfig]);

  // Validate model on mount
  useEffect(() => {
    const model = state.openRouterConfig.model;
    if (model.includes('deepseek') || model === 'openrouter/auto') {
      console.warn(`Invalid model detected: ${model}, resetting to default`);
      dispatch({ 
        type: 'UPDATE_OPENROUTER_CONFIG', 
        payload: { model: 'google/gemini-2.0-flash-exp:free' } 
      });
    }
  }, []); // Only run once on mount

  const currentSession = state.currentSessionId
    ? state.sessions.find(s => s.id === state.currentSessionId) || null
    : null;

  return (
    <AppContext.Provider value={{ state, dispatch, currentSession }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

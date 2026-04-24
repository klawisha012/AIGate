import { useApp } from '../context/AppContext';
import { Message, DetectionConfig, OpenRouterConfig } from '../types';
import { createAuditLog } from '../services/utils';
import { sanitizeText, callOpenRouter } from '../services/piiApi';

export function useChatLogic() {
  const { state, dispatch } = useApp();

  const sendMessage = async (content: string) => {
    if (!content.trim() || state.isProcessing) return;

    // Log PII detection audit event
    const detectionAudit = createAuditLog(
      'PII_DETECTION',
      'ANALYZING',
      `Analyzing user input for PII entities`
    );
    dispatch({ type: 'ADD_AUDIT_LOG', payload: detectionAudit });

    dispatch({ type: 'SET_PROCESSING', payload: true });

    try {
      // Step 1: Sanitize message using backend
      const sanitizeResult = await sanitizeText(content, 'en');
      const sanitizedContent = sanitizeResult.masked_text || content;

      // Create user message with sanitized content
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: sanitizedContent,
        timestamp: Date.now(),
        isSanitized: true,
        originalContent: content,
      };

      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      if (sanitizeResult.entities && sanitizeResult.entities.length > 0) {
        const scrubAudit = createAuditLog(
          'ENTITY_SCRUB',
          'SUCCESS',
          `Masked ${sanitizeResult.entities.length} PII entities`
        );
        dispatch({ type: 'ADD_AUDIT_LOG', payload: scrubAudit });
      }

      // Step 2: Get AI response from OpenRouter directly
      const { openRouterConfig } = state;
      const aiResponseContent = await callOpenRouter(
        openRouterConfig.apiKey,
        openRouterConfig.model,
        [{ role: 'user', content: sanitizedContent }],
        openRouterConfig.language || 'en'
      );

      // Create AI response message
      const aiResponse: Message = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
        isSanitized: true,
        originalContent: content,
      };

      dispatch({ type: 'ADD_MESSAGE', payload: aiResponse });

      const relayAudit = createAuditLog(
        'PROXY_RELAY',
        'COMPLETE',
        'Sanitized request forwarded to LLM'
      );
      dispatch({ type: 'ADD_AUDIT_LOG', payload: relayAudit });

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      const errorAudit = createAuditLog(
        'PII_DETECTION',
        'ERROR',
        `Failed: ${errorMsg}`
      );
      dispatch({ type: 'ADD_AUDIT_LOG', payload: errorAudit });

      // Add error message visible to user
      const errorResponse: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ Error: ${errorMsg}`,
        timestamp: Date.now(),
        isSanitized: false,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorResponse });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  const purgeSession = () => {
    dispatch({ type: 'PURGE_SESSION' });
  };

  return {
    sendMessage,
    purgeSession,
    isProcessing: state.isProcessing,
    currentSession: state.currentSessionId
      ? state.sessions.find(s => s.id === state.currentSessionId) || null
      : null,
  };
}

export function useTerminal() {
  const { state, dispatch } = useApp();

  const toggleTerminal = () => {
    dispatch({ type: 'TOGGLE_TERMINAL' });
  };

  return {
    terminalOpen: state.terminalOpen,
    auditLogs: state.auditLogs,
    toggleTerminal,
  };
}

export function useSettings() {
  const { state, dispatch } = useApp();

  const updateConfig = (updates: Partial<DetectionConfig>) => {
    dispatch({ type: 'UPDATE_DETECTION_CONFIG', payload: updates });
  };

  const toggleSettings = () => {
    dispatch({ type: 'TOGGLE_SETTINGS' });
  };

  return {
    settingsOpen: state.settingsOpen,
    detectionConfig: state.detectionConfig,
    updateConfig,
    toggleSettings,
  };
}

export function useOpenRouter() {
  const { state, dispatch } = useApp();

  const updateOpenRouterConfig = (updates: Partial<OpenRouterConfig>) => {
    dispatch({ type: 'UPDATE_OPENROUTER_CONFIG', payload: updates });
  };

  return {
    openRouterConfig: state.openRouterConfig,
    updateOpenRouterConfig,
  };
}

export function useInspectionPanel() {
  const { state, dispatch } = useApp();

  const toggleInspectionPanel = () => {
    dispatch({ type: 'TOGGLE_INSPECTION_PANEL' });
  };

  return {
    inspectionPanelOpen: state.inspectionPanelOpen,
    toggleInspectionPanel,
  };
}

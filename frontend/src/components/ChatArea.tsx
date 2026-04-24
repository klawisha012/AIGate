import React, { useState, useEffect, useRef } from 'react';
import { useChatLogic, useOpenRouter } from '../hooks/useChatLogic';
import { Message } from '../types';
import { formatTimestamp } from '../services/utils';
import { fetchOpenRouterModels, unmaskWithMapping } from '../services/piiApi';

const ChatArea = () => {
  const { sendMessage, isProcessing, currentSession } = useChatLogic();
  const { openRouterConfig, updateOpenRouterConfig } = useOpenRouter();
  const [inputValue, setInputValue] = useState('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [models, setModels] = useState<any[]>([]);
  const [showSanitizedMap, setShowSanitizedMap] = useState<Record<string, boolean>>({});
  const [showUnmaskedMap, setShowUnmaskedMap] = useState<Record<string, boolean>>({});
  const [unmaskedCache, setUnmaskedCache] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showModelSelector && openRouterConfig.apiKey) {
      loadModels(openRouterConfig.apiKey);
    }
  }, [showModelSelector, openRouterConfig.apiKey]);

  const loadModels = async (apiKey: string) => {
    try {
      const fetchedModels = await fetchOpenRouterModels(apiKey);
      setModels(fetchedModels);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const toggleSanitized = (messageId: string) => {
    setShowSanitizedMap(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const toggleUnmasked = async (messageId: string, assistantContent: string) => {
    if (showUnmaskedMap[messageId]) {
      setShowUnmaskedMap(prev => ({
        ...prev,
        [messageId]: false
      }));
      return;
    }

    const messageIndex = currentSession?.messages.findIndex(m => m.id === messageId) ?? -1;
    const userMessage = currentSession?.messages[messageIndex - 1];

    if (!userMessage || userMessage.role !== 'user' || !userMessage.entities || userMessage.entities.length === 0) {
      setShowUnmaskedMap(prev => ({ ...prev, [messageId]: false }));
      return;
    }

    const PRESIDIO_TO_MASKED: Record<string, string> = {
      'EMAIL_ADDRESS': 'EMAIL',
      'PHONE_NUMBER': 'PHONE',
      'PERSON': 'PERSON',
      'ADDRESS': 'ADDRESS',
      'LOCATION': 'ADDRESS',
      'IP_ADDRESS': 'IP_ADDRESS',
      'DATE_TIME': 'DATE',
      'CREDIT_CARD': 'CREDIT_CARD',
      'US_DRIVER_LICENSE': 'DRIVER_LICENSE',
      'US_PASSPORT': 'PASSPORT',
      'US_BANK_NUMBER': 'BANK_NUMBER',
      'US_ITIN': 'ITIN',
      'ORG': 'ORG',
    };

    const mapping: Record<string, string> = {};
    userMessage.entities.forEach(entity => {
      const key = PRESIDIO_TO_MASKED[entity.type] || entity.type;
      mapping[key] = entity.value;
    });

    try {
      const result = await unmaskWithMapping(assistantContent, mapping);
      setUnmaskedCache(prev => ({
        ...prev,
        [messageId]: result.unmasked
      }));
      setShowUnmaskedMap(prev => ({
        ...prev,
        [messageId]: true
      }));
    } catch (error) {
      console.error('Failed to unmask:', error);
      setShowUnmaskedMap(prev => ({
        ...prev,
        [messageId]: false
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSend = () => {
    if (inputValue.trim() && !isProcessing) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMaskedContent = (content: string) => {
    const parts = content.split(/(\[MASKED_[^\]]+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[MASKED_')) {
        const entityType = part.slice(8, -1);
        return (
          <span
            key={index}
            className="masked-entity"
            onClick={(e) => e.currentTarget.classList.toggle('revealed')}
            title={`Click to reveal ${entityType}`}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <main className="ml-64 mr-96 flex-1 flex flex-col relative bg-[#131316]">
      <div className="flex-1 overflow-y-auto p-lg scrollbar-hide flex flex-col gap-lg items-center">
        {(!currentSession || currentSession.messages.length === 0) && (
          <div className="max-w-2xl w-full mt-xl text-center">
            <h1 className="font-h1 text-on-surface mb-sm">Secure Interface</h1>
            <p className="text-on-surface-variant font-body-md opacity-70">
              Traffic is being actively monitored and scrubbed for PII.
            </p>
          </div>
        )}

        {currentSession?.messages.map((message: Message) => (
          <div
            key={message.id}
            className={`max-w-2xl w-full flex flex-col gap-xs ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {message.role === 'user' && (
              <>
                <div className="bg-surface-container neo-border p-md rounded-lg max-w-[85%]">
                  <p className="text-on-surface font-body-md">
                    {showSanitizedMap[message.id]
                      ? renderMaskedContent(message.content)
                      : message.originalContent || message.content
                    }
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-neutral-600 uppercase">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <button
                    onClick={() => toggleSanitized(message.id)}
                    className="flex items-center gap-1 text-[10px] font-mono text-rose-500 hover:text-rose-400 uppercase opacity-60 hover:opacity-100 transition-opacity"
                    title={showSanitizedMap[message.id] ? "Show original message" : "Show sanitized version"}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showSanitizedMap[message.id] ? 'visibility_off' : 'visibility'}
                    </span>
                    {showSanitizedMap[message.id] ? 'Original' : 'Sanitized'}
                  </button>
                </div>
              </>
            )}

            {message.role === 'assistant' && (
              <div className="bg-surface-container-high neo-border-accent p-md rounded-lg max-w-[85%] hard-shadow w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-rose-500">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                    <span className="font-label-caps text-[10px]">AI RESPONSE</span>
                  </div>
                  {message.content.includes('[MASKED_') && (
                    <button
                      onClick={() => toggleUnmasked(message.id, message.content)}
                      className="flex items-center gap-1 text-[10px] font-mono text-rose-500 hover:text-rose-400 uppercase opacity-60 hover:opacity-100 transition-opacity"
                      title={showUnmaskedMap[message.id] ? "Show masked version" : "Show original values"}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {showUnmaskedMap[message.id] ? 'visibility_off' : 'visibility'}
                      </span>
                      {showUnmaskedMap[message.id] ? 'Masked' : 'Unmasked'}
                    </button>
                  )}
                </div>
                <p className="text-on-surface font-body-md whitespace-pre-wrap">
                  {showUnmaskedMap[message.id] && unmaskedCache[message.id]
                    ? unmaskedCache[message.id]
                    : message.content}
                </p>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="max-w-2xl w-full flex flex-col gap-xs items-start">
            <div className="bg-surface-container-high neo-border-accent p-md rounded-lg max-w-[85%]">
              <div className="flex items-center gap-2 text-rose-500">
                <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></div>
                <span className="material-symbols-outlined text-sm animate-pulse">hourglass_top</span>
                <span className="font-label-caps text-[10px]">SCANNING_FOR_PII</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-lg border-t border-neutral-900 bg-surface">
        <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-rose-500">smart_toy</span>
            <span className="font-bold">{openRouterConfig.model.split('/').pop()?.split(':')[0]}</span>
            <span className="material-symbols-outlined text-xs">
              {showModelSelector ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <span className="font-label-caps text-[9px] text-neutral-600">
            PRIVACYGATE AI
          </span>
        </div>

        {showModelSelector && (
          <div className="max-w-3xl mx-auto mb-2 bg-neutral-950 border border-neutral-800 shadow-lg max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-neutral-800">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 px-3 py-2 text-xs focus:border-rose-700 focus:outline-none"
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {models
                .filter(m =>
                  m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
                  m.name.toLowerCase().includes(modelSearch.toLowerCase())
                )
                .map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      updateOpenRouterConfig({ model: model.id });
                      setShowModelSelector(false);
                      setModelSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                      openRouterConfig.model === model.id
                        ? 'bg-rose-900/30 text-rose-400'
                        : 'text-neutral-400 hover:bg-neutral-900'
                    }`}
                  >
                    <span>{model.free ? '🔶' : '🔷'}</span>
                    <span className="flex-1">{model.name}</span>
                    {openRouterConfig.model === model.id && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </button>
                ))}
              {models.filter(m =>
                m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
                m.name.toLowerCase().includes(modelSearch.toLowerCase())
              ).length === 0 && (
                <div className="p-3 text-xs text-neutral-500 text-center">
                  No models found. Check your API key in Settings.
                </div>
              )}
            </div>

            <div className="p-2 border-t border-neutral-800 text-[9px] text-neutral-600 text-center">
              {models.filter(m => m.free).length} free / {models.length} total models
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto relative">
          <input
            className="w-full bg-[#1A1A1D] border-0 border-b-2 border-neutral-700 focus:border-rose-700 text-on-surface py-4 px-4 font-mono text-sm tracking-wider focus:ring-0 transition-colors duration-200"
            placeholder="SECURE MESSAGE INPUT..."
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isProcessing}
          />
          <button
            className={`absolute right-2 top-2 p-2 transition-all duration-200 ${
              inputValue.trim() && !isProcessing
                ? 'bg-primary-container text-white hover:bg-rose-700'
                : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
            onClick={handleSend}
            disabled={!inputValue.trim() || isProcessing}
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-rose-600 animate-pulse"></div>
            <span className="font-label-caps text-[10px] text-neutral-500">
              ENCRYPTION: AES-256-GCM
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600"></div>
            <span className="font-label-caps text-[10px] text-neutral-500">
              ANONYMIZER: ACTIVE
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatArea;

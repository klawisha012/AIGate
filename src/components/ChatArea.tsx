import React, { useState, useEffect, useRef } from 'react';
import { useChatLogic } from '../hooks/useChatLogic';
import { Message } from '../types';
import { formatTimestamp } from '../services/utils';

const ChatArea = () => {
  const { sendMessage, isProcessing, currentSession } = useChatLogic();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

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
        const entityType = part.slice(8, -1); // Extract type from [MASKED_XXX]
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
      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto p-lg scrollbar-hide flex flex-col gap-lg items-center">
        {/* Welcome State */}
        {(!currentSession || currentSession.messages.length === 0) && (
          <div className="max-w-2xl w-full mt-xl text-center">
            <h1 className="font-h1 text-on-surface mb-sm">Secure Interface</h1>
            <p className="text-on-surface-variant font-body-md opacity-70">
              Traffic is being actively monitored and scrubbed for PII.
            </p>
          </div>
        )}

        {/* Messages */}
        {currentSession?.messages.map((message: Message) => (
          <div
            key={message.id}
            className={`max-w-2xl w-full flex flex-col gap-xs ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* User Message */}
            {message.role === 'user' && (
              <>
                <div className="bg-surface-container neo-border p-md rounded-lg max-w-[85%]">
                  <p className="text-on-surface font-body-md">
                    {renderMaskedContent(message.content)}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-neutral-600 uppercase">
                  Input Scrubbed • {formatTimestamp(message.timestamp)}
                </span>
              </>
            )}

            {/* Assistant Message */}
            {message.role === 'assistant' && (
              <div className="bg-surface-container-high neo-border-accent p-md rounded-lg max-w-[85%] hard-shadow w-full">
                <div className="flex items-center gap-2 mb-2 text-rose-500">
                  <span className="material-symbols-outlined text-sm">security</span>
                  <span className="font-label-caps text-[10px]">PrivacyGate Analysis</span>
                </div>
                <p className="text-on-surface font-body-md whitespace-pre-wrap">
                  {renderMaskedContent(message.content)}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Processing Indicator */}
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

      {/* Input Bar */}
      <div className="p-lg border-t border-neutral-900 bg-surface">
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

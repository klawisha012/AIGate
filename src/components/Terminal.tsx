import { useEffect, useRef } from 'react';
import { useTerminal } from '../hooks/useChatLogic';

const Terminal = () => {
  const { terminalOpen, toggleTerminal, auditLogs } = useTerminal();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalOpen && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [auditLogs, terminalOpen]);

  if (!terminalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
         onClick={toggleTerminal}>
      <div
        className="bg-neutral-950 border-2 border-rose-700 rounded-lg shadow-[8px_8px_0px_0px_#1a1a1d] w-full max-w-4xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-500 text-sm">terminal</span>
            <span className="font-mono text-xs text-rose-500 uppercase tracking-widest">
              system_terminal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-neutral-500 hover:text-rose-500 transition-colors">
              <span className="material-symbols-outlined text-sm">settings</span>
            </button>
            <button
              className="text-neutral-500 hover:text-rose-500 transition-colors"
              onClick={toggleTerminal}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1 custom-scrollbar"
          style={{ maxHeight: '60vh' }}
        >
          {/* System Info */}
          <div className="text-neutral-600 mb-4 pb-2 border-b border-neutral-800">
            <div className="text-neutral-400">PrivacyGate AI System v1.0.0</div>
            <div className="text-neutral-500">Session ID: {auditLogs[0]?.timestamp || 'N/A'}</div>
          </div>

          {/* Audit Logs */}
          {auditLogs.length === 0 ? (
            <div className="text-neutral-600 italic">No system logs available.</div>
          ) : (
            auditLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-3 py-1">
                <span className="text-neutral-600 font-bold min-w-[80px]">
                  {log.timestamp}
                </span>
                <span className="text-cyan-500 font-bold min-w-[150px]">
                  {log.event.padEnd(20, ' ')}
                </span>
                <span className={`
                  font-bold min-w-[80px]
                  ${log.status === 'SUCCESS' || log.status === 'COMPLETE'
                    ? 'text-green-500'
                    : log.status === 'ANALYZING' || log.status === 'PENDING'
                    ? 'text-yellow-500'
                    : 'text-rose-500'
                  }
                `}>
                  {log.status}
                </span>
                {log.details && (
                  <span className="text-neutral-400">{log.details}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Terminal Footer */}
        <div className="px-4 py-2 bg-neutral-900 border-t border-neutral-800 text-neutral-500 font-mono text-[10px]">
          <span className="text-green-500">root@privacygate</span>:<span className="text-rose-500">~</span>$
          <span className="animate-pulse ml-1">_</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;

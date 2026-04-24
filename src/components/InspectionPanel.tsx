import React from 'react';
import { useApp } from '../context/AppContext';
import { sanitizePayload } from '../services/piiApi';

const InspectionPanel = () => {
  const { state, currentSession } = useApp();
  const [apiResult, setApiResult] = React.useState<{
    original: any;
    sanitized: any;
    entities: any[];
  } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get the latest user message to inspect
  const latestUserMessage = currentSession?.messages
    .filter((m) => m.role === 'user')
    .slice(-1)[0];

  React.useEffect(() => {
    if (!latestUserMessage) {
      setApiResult(null);
      return;
    }

    const payload = {
      session_id: state.currentSessionId || 'unknown',
      data: {
        user: 'john.doe@enterprise.com',
        location: 'New York, NY',
        message: latestUserMessage.content,
      },
      metadata: {
        ip: '192.168.1.45',
        client: 'PG-Web-v1',
        timestamp: new Date().toISOString(),
      },
    };

    setLoading(true);
    setError(null);

    sanitizePayload(payload, 'en')
      .then((result) => {
        setApiResult(result);
        setLoading(false);
      })
      .catch((err) => {
        console.error('API Error:', err);
        setError(err.message || 'Failed to connect to PII detection service');
        setLoading(false);
      });
  }, [latestUserMessage, state.currentSessionId]);

  const original = apiResult?.original || null;
  const sanitized = apiResult?.sanitized || null;
  const entities = apiResult?.entities || [];

  return (
    <aside className="fixed right-0 top-0 pt-14 h-full w-96 border-l-2 border-neutral-800 bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center">
        <h2 className="font-mono text-xs font-bold text-rose-500 tracking-tighter">
          INSPECTION_PANEL
        </h2>
        <span className="material-symbols-outlined text-neutral-500 text-sm">
          filter_list
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-lg font-mono text-[11px] leading-relaxed">
        {loading && (
          <div className="flex items-center justify-center h-32 text-neutral-500">
            <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
            Processing...
          </div>
        )}

        {error && (
          <div className="bg-rose-900/20 border border-rose-800 p-3 text-rose-400 text-[10px]">
            <div className="font-bold mb-1">API Connection Error</div>
            <div>{error}</div>
            <div className="mt-2 text-neutral-500">Make sure backend is running on http://localhost:8000</div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Original Payload */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-3 bg-rose-800"></span>
                <h3 className="text-neutral-400 uppercase tracking-widest font-bold">
                  Original Payload
                </h3>
              </div>
              <div className="bg-[#1A1A1D] p-4 border border-neutral-800 text-neutral-500 overflow-x-auto">
                <pre className="whitespace-pre-wrap text-[10px]">
                  {original
                    ? JSON.stringify(original, null, 2)
                    : `{
  "session_id": "waiting...",
  "data": {
    "user": "john.doe@enterprise.com",
    "location": "New York, NY",
    "message": "Awaiting input..."
  },
  "metadata": {
    "ip": "192.168.1.45",
    "client": "PG-Web-v1"
  }
}`}
                </pre>
              </div>
            </section>

            {/* Arrow Divider */}
            <div className="flex justify-center py-2">
              <span className="material-symbols-outlined text-rose-700">
                keyboard_double_arrow_down
              </span>
            </div>

            {/* Sanitized Payload */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-3 bg-green-800"></span>
                <h3 className="text-neutral-400 uppercase tracking-widest font-bold">
                  Sanitized Payload
                </h3>
              </div>
              <div className="bg-[#1A1A1D] p-4 border border-rose-900/30 text-rose-100/80 overflow-x-auto">
                <pre className="whitespace-pre-wrap text-[10px]">
                  {sanitized
                    ? JSON.stringify(sanitized, null, 2)
                    : `{
  "session_id": "waiting...",
  "data": {
    "user": "[MASKED_EMAIL]",
    "location": "[MASKED_CITY]",
    "message": "Submit a message to see transformation..."
  },
  "metadata": {
    "ip": "0.0.0.0",
    "client": "PG-Web-v1"
  }
}`}
                </pre>
              </div>
            </section>

            {/* Quick Stats */}
            {latestUserMessage && (
              <section className="mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-3 bg-cyan-800"></span>
                  <h3 className="text-neutral-400 uppercase tracking-widest font-bold">
                    Detection Stats
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-900 border border-neutral-800 p-3">
                    <div className="text-[9px] text-neutral-500 uppercase">Input Length</div>
                    <div className="text-lg font-bold text-rose-500">
                      {latestUserMessage.content.length}
                    </div>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 p-3">
                    <div className="text-[9px] text-neutral-500 uppercase">PII Detected</div>
                    <div className="text-lg font-bold text-green-500">
                      {entities.length}
                    </div>
                  </div>
                </div>

                {/* Detected Entities */}
                {entities.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[9px] text-neutral-500 uppercase mb-2">Detected Entities</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {entities.map((entity, index) => (
                        <div key={index} className="bg-neutral-900 border border-neutral-800 p-2 text-[10px]">
                          <span className="text-rose-400">{entity.entity_type}</span>
                          <span className="text-neutral-500 ml-2">{entity.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Audit Log */}
        <section className="mt-auto pt-lg border-t border-neutral-900">
          <div className="font-label-caps text-[9px] text-neutral-600 mb-2">
            SYSTEM_LOGS
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {state.auditLogs.length === 0 ? (
              <div className="text-neutral-600 italic">No logs yet...</div>
            ) : (
              state.auditLogs.map((log, index) => (
                <div key={index} className="flex justify-between text-neutral-600">
                  <span>{log.timestamp} - {log.event}</span>
                  <span className={`
                    ${log.status === 'SUCCESS' || log.status === 'COMPLETE'
                      ? 'text-green-600'
                      : log.status === 'ANALYZING' || log.status === 'PENDING'
                      ? 'text-yellow-600'
                      : 'text-rose-600'
                    }
                  `}>
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};

export default InspectionPanel;

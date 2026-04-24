import { useApp } from '../context/AppContext';
import { Session } from '../types';

const Sidebar = () => {
  const { state, dispatch } = useApp();
  const sessions = state.sessions;

  const handleNewChat = () => {
    dispatch({ type: 'PURGE_SESSION' });
    const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  const handlePurgeSession = () => {
    if (window.confirm('Are you sure you want to purge all sessions? This action cannot be undone.')) {
      dispatch({ type: 'PURGE_SESSION' });
    }
  };

  const handleSessionClick = (sessionId: string) => {
    dispatch({ type: 'SET_CURRENT_SESSION', payload: sessionId });
  };

  const formatSessionDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getPreviewText = (session: Session) => {
    const lastUserMessage = [...session.messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return 'Empty session';
    const text = lastUserMessage.content;
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  };

  return (
    <nav className="fixed left-0 top-0 pt-14 flex flex-col h-full z-40 h-screen w-64 border-r-2 border-neutral-800 bg-neutral-950 font-mono text-xs uppercase">
      {/* Gateway Header */}
      <div className="p-6 border-b border-neutral-900">
        <div className="text-rose-700 font-black">GATEWAY</div>
        <div className="text-[10px] text-neutral-600 mt-1">SECURE_SESSION_V1</div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-4 overflow-y-auto">
        {/* New Chat - Active State */}
        <div
          className="bg-neutral-900 text-rose-500 border-r-4 border-rose-700 px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-neutral-800 transition-colors"
          onClick={handleNewChat}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            add_box
          </span>
          <span>New Chat</span>
        </div>

        {/* History Section */}
        {sessions.length > 0 && (
          <div className="mt-4">
            <div className="px-4 py-2 text-neutral-600 font-bold text-[10px] uppercase tracking-wider">
              Recent Sessions
            </div>
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className={`px-4 py-2 flex items-center gap-3 cursor-pointer transition-all hover:bg-neutral-900/50 hover:text-neutral-200 ${
                  state.currentSessionId === session.id
                    ? 'text-rose-500 bg-neutral-900/30 border-l-2 border-rose-600'
                    : 'text-neutral-500'
                }`}
                onClick={() => handleSessionClick(session.id)}
              >
                <span className="material-symbols-outlined text-sm">history</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{getPreviewText(session)}</div>
                  <div className="text-[9px] text-neutral-600">
                    {formatSessionDate(session.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-neutral-900">
        <button
          className="w-full bg-primary-container text-white py-3 font-black tracking-widest hover:bg-rose-700 active:scale-95 transition-all"
          onClick={handlePurgeSession}
        >
          PURGE SESSION
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;

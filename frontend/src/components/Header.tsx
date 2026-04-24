import { useInspectionPanel, useSettings } from '../hooks/useChatLogic';

const Header = () => {
  const { toggleInspectionPanel } = useInspectionPanel();
  const { toggleSettings } = useSettings();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 py-3 bg-neutral-950 border-b-2 border-neutral-800 shadow-[4px_0px_0px_0px_#6F2232]">
      <div className="text-xl font-black text-rose-700 tracking-widest font-sans uppercase tracking-tighter">
        PrivacyGate AI
      </div>
      <div className="flex items-center gap-4">
        <button
          className="text-neutral-500 hover:text-rose-500 transition-colors duration-150 active:translate-y-0.5"
          onClick={toggleInspectionPanel}
          title="Inspection Panel"
        >
          <span className="material-symbols-outlined">terminal</span>
        </button>
        <button
          className="text-neutral-500 hover:text-rose-500 transition-colors duration-150 active:translate-y-0.5"
          onClick={toggleSettings}
          title="Settings"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
};

export default Header;

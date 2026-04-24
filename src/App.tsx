import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import InspectionPanel from './components/InspectionPanel';
import Terminal from './components/Terminal';
import Settings from './components/Settings';
import { useApp } from './context/AppContext';

function App() {
  const { state } = useApp();

  return (
    <div className="flex h-screen pt-14">
      <Header />
      <Sidebar />
      <ChatArea />
      {state.inspectionPanelOpen && <InspectionPanel />}
      <Terminal />
      <Settings />
    </div>
  );
}

export default App;

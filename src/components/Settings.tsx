import { useState, useEffect } from 'react';
import { useSettings, useOpenRouter } from '../hooks/useChatLogic';
import { DetectionConfig } from '../types';
import { fetchOpenRouterModels, OpenRouterModel } from '../services/piiApi';

const Settings = () => {
  const { settingsOpen, detectionConfig, updateConfig, toggleSettings } = useSettings();
  const { openRouterConfig, updateOpenRouterConfig } = useOpenRouter();

  // Local state for unsaved changes
  const [localDetectionConfig, setLocalDetectionConfig] = useState<DetectionConfig>(detectionConfig);
  const [localOpenRouterConfig, setLocalOpenRouterConfig] = useState(openRouterConfig);

  // State for dynamically loaded models
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Fetch models when settings open or API key changes
  useEffect(() => {
    if (settingsOpen) {
      setLocalDetectionConfig(detectionConfig);
      setLocalOpenRouterConfig(openRouterConfig);

      // Fetch models if API key is available
      if (openRouterConfig.apiKey) {
        loadModels(openRouterConfig.apiKey);
      } else {
        setModels([]);
        setModelsError('API key required to load models');
      }
    }
  }, [settingsOpen, openRouterConfig.apiKey]);

  const loadModels = async (apiKey: string) => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const fetchedModels = await fetchOpenRouterModels(apiKey);
      setModels(fetchedModels);

      // Validate current model
      const modelExists = fetchedModels.some(m => m.id === localOpenRouterConfig.model);
      if (!modelExists && localOpenRouterConfig.model) {
        const defaultModel = 'google/gemini-2.0-flash-exp:free';
        console.warn(`Invalid model ${localOpenRouterConfig.model}, resetting to ${defaultModel}`);
        const newConfig = { ...localOpenRouterConfig, model: defaultModel };
        setLocalOpenRouterConfig(newConfig);
        updateOpenRouterConfig({ model: defaultModel });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load models';
      setModelsError(errorMsg);
      console.error('Failed to fetch models:', err);
    } finally {
      setModelsLoading(false);
    }
  };

  if (!settingsOpen) return null;

  const handleToggle = (key: keyof DetectionConfig) => {
    setLocalDetectionConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    // Apply all changes to global state
    updateConfig(localDetectionConfig as Partial<DetectionConfig>);
    updateOpenRouterConfig(localOpenRouterConfig);
    toggleSettings();
  };

  const handleCancel = () => {
    // Reset to original values and close
    setLocalDetectionConfig(detectionConfig);
    setLocalOpenRouterConfig(openRouterConfig);
    toggleSettings();
  };

  const detectionOptions: { key: keyof DetectionConfig; label: string; description: string }[] = [
    { key: 'enableEmail', label: 'Email Addresses', description: 'Detect and mask email patterns' },
    { key: 'enablePhone', label: 'Phone Numbers', description: 'Detect and mask phone numbers' },
    { key: 'enableAddress', label: 'Physical Addresses', description: 'Detect and mask street addresses' },
    { key: 'enablePerson', label: 'Person Names', description: 'Detect and mask personal names' },
    { key: 'enableSSN', label: 'Social Security Numbers', description: 'Detect and mask SSN patterns' },
    { key: 'enableCreditCard', label: 'Credit Cards', description: 'Detect and mask credit card numbers' },
    { key: 'enableDate', label: 'Dates', description: 'Detect and mask date patterns' },
    { key: 'enableIP', label: 'IP Addresses', description: 'Detect and mask IP addresses' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
         onClick={toggleSettings}>
      <div
        className="bg-neutral-950 border-2 border-rose-700 rounded-lg shadow-[8px_8px_0px_0px_#1a1a1d] w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Settings Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-500">settings</span>
            <h2 className="font-mono text-sm font-bold text-rose-500 uppercase tracking-widest">
              Detection Settings
            </h2>
          </div>
          <button
            className="text-neutral-500 hover:text-rose-500 transition-colors"
            onClick={toggleSettings}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* OpenRouter Configuration */}
          <div className="mb-6">
            <h3 className="font-label-caps text-xs text-neutral-400 uppercase tracking-widest mb-3">
              OpenRouter Configuration
            </h3>
            <p className="text-neutral-500 text-sm mb-4">
              Configure your OpenRouter API key and select the AI model to use for PII analysis.
            </p>

            <div className="space-y-3">
              {/* API Key Input */}
              <div className="p-3 bg-neutral-900 border border-neutral-800">
                <label className="block font-mono text-xs text-on-surface font-bold mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={localOpenRouterConfig.apiKey}
                  onChange={(e) => setLocalOpenRouterConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-or-..."
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 px-3 py-2 font-mono text-xs focus:border-rose-700 focus:outline-none transition-colors"
                />
                <div className="text-[9px] text-neutral-600 mt-1">
                  Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:underline">openrouter.ai/keys</a>
                </div>
              </div>

              {/* Model Selection */}
              <div className="p-3 bg-neutral-900 border border-neutral-800">
                <label className="block font-mono text-xs text-on-surface font-bold mb-2">
                  Model
                </label>

                {modelsLoading && (
                  <div className="text-neutral-400 text-xs mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    Loading models...
                  </div>
                )}

                {modelsError && (
                  <div className="text-rose-400 text-xs mb-2">
                    Error: {modelsError}
                  </div>
                )}

                {!modelsLoading && !modelsError && models.length === 0 && (
                  <div className="text-neutral-500 text-xs mb-2">
                    No models available. Check your API key.
                  </div>
                )}

                <select
                  value={localOpenRouterConfig.model}
                  onChange={(e) => setLocalOpenRouterConfig(prev => ({ ...prev, model: e.target.value }))}
                  disabled={modelsLoading || models.length === 0}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-300 px-3 py-2 font-mono text-xs focus:border-rose-700 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.free ? '🔶 ' : '🔷 '}{model.name} {model.free ? '(Free)' : ''}
                    </option>
                  ))}
                </select>

                <div className="text-[9px] text-neutral-600 mt-1">
                  🟡 Free models have zero cost. Paid models require credits.
                  {models.length > 0 && (
                    <span className="ml-2">({models.filter(m => m.free).length} free / {models.length} total)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PII Detection Rules */}
          <div className="mb-6">
            <h3 className="font-label-caps text-xs text-neutral-400 uppercase tracking-widest mb-3">
              PII Detection Rules
            </h3>
            <p className="text-neutral-500 text-sm mb-4">
              Configure which types of personal information should be automatically detected and masked.
            </p>

            <div className="space-y-3">
              {detectionOptions.map((option) => (
                <div
                  key={option.key}
                  className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 hover:border-rose-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs text-on-surface font-bold">
                      {option.label}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      {option.description}
                    </div>
                  </div>
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      localDetectionConfig[option.key]
                        ? 'bg-primary-container'
                        : 'bg-neutral-700'
                    }`}
                    onClick={() => handleToggle(option.key)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        localDetectionConfig[option.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security Info */}
          <div className="mt-6 p-4 bg-neutral-900 border border-neutral-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-green-500 text-sm">security</span>
              <div>
                <div className="font-mono text-xs text-on-surface font-bold mb-1">
                  Privacy Protection Active
                </div>
                <div className="text-[10px] text-neutral-500">
                  All detection happens locally in your browser. No raw data leaves this session.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-neutral-900 border-t border-neutral-800 flex justify-end gap-3">
          <button
            className="px-6 py-2 bg-neutral-700 text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-600 transition-colors"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-primary-container text-white font-mono text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-colors"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

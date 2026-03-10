import { Upload, Shield } from 'lucide-react';
import type { CalculatorMode, ModuleSelection, TabConfig } from '../types';

interface TabNavigationProps {
  activeTab: CalculatorMode;
  onTabChange: (tab: CalculatorMode) => void;
  availableModules: ModuleSelection;
}

const TABS: TabConfig[] = [
  {
    id: 'registration',
    label: 'Registration',
    description: 'Upload & SyncData module',
  },
  {
    id: 'authentication',
    label: 'Authentication',
    description: 'ID Authentication module',
  },
];

const TAB_ICONS: Record<string, typeof Upload> = {
  registration: Upload,
  authentication: Shield,
};

export function TabNavigation({ activeTab, onTabChange, availableModules }: TabNavigationProps) {
  const visibleTabs = TABS.filter(tab => availableModules[tab.id]);

  if (visibleTabs.length <= 1) return null;

  return (
    <div className="tab-navigation">
      {visibleTabs.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        return (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={18} />
            <div className="tab-text">
              <span className="tab-label">{tab.label}</span>
              <span className="tab-description">{tab.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { MobileLayout } from '@/src/components/layout/MobileLayout';
import { Home } from '@/src/pages/Home';
import { AnalysisDashboard } from '@/src/pages/AnalysisDashboard';
import { TraitsDashboard } from '@/src/pages/TraitsDashboard';
import { History } from '@/src/pages/History';
import { Settings } from '@/src/pages/Settings';
import { useStore } from '@/src/store/useStore';

export type Tab = 'home' | 'analysis' | 'traits' | 'history' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const checkAndApplyDecay = useStore(state => state.checkAndApplyDecay);

  useEffect(() => {
    checkAndApplyDecay();
  }, [checkAndApplyDecay]);

  return (
    <MobileLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <Home onNavigate={setActiveTab} />}
      {activeTab === 'analysis' && <AnalysisDashboard />}
      {activeTab === 'traits' && <TraitsDashboard />}
      {activeTab === 'history' && <History onNavigate={setActiveTab} />}
      {activeTab === 'settings' && <Settings />}
    </MobileLayout>
  );
}

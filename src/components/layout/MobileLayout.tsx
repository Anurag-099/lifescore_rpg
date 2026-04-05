import { ReactNode } from 'react';
import { Home, BarChart2, User, History, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Tab } from '@/src/App';

type MobileLayoutProps = {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function MobileLayout({ children, activeTab, onTabChange }: MobileLayoutProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Log' },
    { id: 'analysis', icon: BarChart2, label: 'Analysis' },
    { id: 'traits', icon: User, label: 'Traits' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-50 font-sans">
      <header className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-semibold tracking-tight">LifeScore AI</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 w-full border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-lg pb-safe">
        <div className="flex justify-around items-center p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                  isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Icon className={cn("w-6 h-6 mb-1", isActive && "drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]")} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

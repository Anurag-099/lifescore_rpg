import { useState } from 'react';
import { useStore, Traits } from '@/src/store/useStore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Star, Trophy, Zap, Crown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { getOverallLevel, getTraitLevel, getIdentityLabel } from '@/src/lib/leveling';

export function TraitsDashboard() {
  const { overallTraits, getAllActivities, customTraits } = useStore();
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'relative' | 'absolute'>('relative');

  // Overall Character Level
  const totalXp = Object.values(overallTraits).reduce((a, b) => a + b, 0);
  const { level: overallLevel, currentXP, nextLevelXP, progressPercent } = getOverallLevel(totalXp);
  const identityLabel = getIdentityLabel(overallLevel);

  // Format data for Recharts (Dynamic Normalization)
  const maxTraitXp = Math.max(1, ...customTraits.map(t => overallTraits[t] || 0));
  const data = customTraits.map(trait => {
    const xp = overallTraits[trait] || 0;
    const normalized = Math.max(0, (xp / maxTraitXp) * 100);
    return {
      subject: trait,
      A: normalized,
      fullMark: 100,
      actualXp: xp
    };
  });

  // History for selected trait
  const traitHistory = selectedTrait ? getAllActivities()
    .filter(a => a.analysis && a.analysis.traitsAffected[selectedTrait] && a.analysis.traitsAffected[selectedTrait] !== 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15) : [];

  const getIdentityIcon = (label: string) => {
    if (label.startsWith('Ascended')) return <Crown className="w-5 h-5 text-cyan-400" />;
    if (label.startsWith('Mythic')) return <Crown className="w-5 h-5 text-rose-400" />;
    if (label.startsWith('Legend')) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (label === 'Master') return <Star className="w-5 h-5 text-purple-400" />;
    if (label === 'Elite') return <Trophy className="w-5 h-5 text-emerald-400" />;
    if (label === 'Disciplined') return <Shield className="w-5 h-5 text-blue-400" />;
    if (label === 'Consistent') return <Zap className="w-5 h-5 text-orange-400" />;
    return <Shield className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Character Profile</h2>
        <p className="text-zinc-400 text-sm mt-1">Your infinite progression journey</p>
      </div>

      {/* Level Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          {getIdentityIcon(identityLabel)}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            {getIdentityIcon(identityLabel)}
            <span className="text-zinc-300 font-medium tracking-wide uppercase text-xs">{identityLabel}</span>
          </div>
          <div className="flex items-end gap-3 mb-6">
            <div className="text-5xl font-bold text-zinc-50 tracking-tighter">Lv {overallLevel}</div>
            <div className="text-zinc-400 mb-1 font-mono">{totalXp} Total XP</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-zinc-400 px-1">
              <span>{currentXP} XP</span>
              <span>{nextLevelXP} XP to Lv {overallLevel + 1}</span>
            </div>
            <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Toggle View */}
      <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
        <button 
          onClick={() => setViewMode('relative')} 
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-colors", 
            viewMode === 'relative' ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Relative View
        </button>
        <button 
          onClick={() => setViewMode('absolute')} 
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-colors", 
            viewMode === 'absolute' ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Absolute View
        </button>
      </div>

      {viewMode === 'relative' ? (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid stroke="#27272a" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
              <Radar
                name="Traits"
                dataKey="A"
                stroke="#34d399"
                fill="#34d399"
                fillOpacity={0.3}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ color: '#34d399' }}
                formatter={(value: number, name: string, props: any) => [props.payload.actualXp + ' XP', 'Total XP']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 px-1">Tap a trait to see its history</p>
          {customTraits.map((trait, index) => {
            const xp = overallTraits[trait] || 0;
            const { level, currentXP, nextLevelXP, progressPercent } = getTraitLevel(xp);
            
            return (
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={trait} 
                onClick={() => setSelectedTrait(trait)}
                className="w-full bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/50 rounded-2xl p-4 text-left transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-zinc-200">{trait}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-0.5 rounded-md">Lv {level}</span>
                    <span className={cn(
                      "font-mono text-sm",
                      xp >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>{xp} xp</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
                    <span>{currentXP} / {nextLevelXP}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Trait History Modal */}
      <AnimatePresence>
        {selectedTrait && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrait(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-zinc-900 border-t border-zinc-800 p-6 rounded-t-3xl max-h-[85vh] overflow-y-auto pb-safe"
            >
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-zinc-900 pb-2 z-10">
                <h3 className="text-xl font-semibold capitalize">{selectedTrait} History</h3>
                <button onClick={() => setSelectedTrait(null)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {traitHistory.length > 0 ? traitHistory.map(activity => (
                  <div key={activity.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <p className="text-zinc-200 font-medium text-sm">{activity.text}</p>
                      <span className={cn(
                        "font-mono text-sm shrink-0 px-2 py-0.5 rounded-md",
                        activity.analysis!.traitsAffected[selectedTrait] > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>
                        {activity.analysis!.traitsAffected[selectedTrait] > 0 ? '+' : ''}{activity.analysis!.traitsAffected[selectedTrait]}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{activity.analysis!.reasoning}</p>
                    <p className="text-[10px] text-zinc-600 mt-3 font-mono">{format(new Date(activity.date), 'MMM d, yyyy')}</p>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <p className="text-zinc-500">No activities affecting this trait yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

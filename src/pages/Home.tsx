import React, { useState, useMemo } from 'react';
import { format, isSameDay, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Sparkles, Trash2, Calendar, Clock, Target, Zap } from 'lucide-react';
import { useStore } from '@/src/store/useStore';
import { analyzeDayIncremental } from '@/src/lib/ai';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Home({ onNavigate }: { onNavigate: (tab: 'analysis') => void }) {
  const [date, setDate] = useState<Date>(new Date());
  const [input, setInput] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getDay, addActivity, removeActivity, updateDayAnalysis, setTheme, streak, getAllActivities, customTraits, hardMode, decayMessage, clearDecayMessage } = useStore();

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayData = getDay(dateStr);
  const activities = dayData.activities;
  
  const unanalyzedActivities = activities.filter(a => !a.analysis);
  const analyzedActivities = activities.filter(a => a.analysis);

  // Calculate frequent activities for quick-tap
  const allActivities = getAllActivities();
  const frequentActivities = useMemo(() => {
    const counts: Record<string, number> = {};
    allActivities.forEach(a => {
      const text = a.text.trim();
      counts[text] = (counts[text] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(entry => entry[0]);
  }, [allActivities]);

  const handleAdd = (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToAdd = textOverride || input.trim();
    if (!textToAdd) return;

    // Split by comma to allow multiple activities at once
    const newActivities = textToAdd.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    newActivities.forEach(actText => {
      addActivity(dateStr, { id: uuidv4(), text: actText, date: dateStr });
    });
    
    if (!textOverride) setInput('');
  };

  const handleSaveTheme = () => {
    if (themeInput.trim()) {
      setTheme(dateStr, themeInput.trim());
    }
    setIsEditingTheme(false);
  };

  const handleAnalyze = async () => {
    if (unanalyzedActivities.length === 0) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const { updatedActivities, newSummary } = await analyzeDayIncremental(
        dateStr, 
        unanalyzedActivities, 
        analyzedActivities, 
        dayData.summary,
        dayData.theme,
        customTraits,
        hardMode
      );
      updateDayAnalysis(dateStr, updatedActivities, newSummary);
      onNavigate('analysis');
    } catch (err) {
      console.error(err);
      setError('Failed to analyze day. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isToday = isSameDay(date, new Date());
  const isYesterday = isSameDay(date, subDays(new Date(), 1));

  return (
    <div className="space-y-8">
      {/* Decay Message */}
      <AnimatePresence>
        {decayMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex justify-between items-center"
          >
            <p className="text-red-400 text-sm font-medium">{decayMessage}</p>
            <button onClick={clearDecayMessage} className="text-red-400 hover:text-red-300 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Streak */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Log Activities</h2>
          <p className="text-zinc-400 text-sm mt-1">Log what you did, anytime.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
          <span className="text-orange-400">🔥</span>
          <span className="font-mono font-medium">{streak}</span>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        <button
          onClick={() => setDate(new Date())}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
            isToday ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Today
        </button>
        <button
          onClick={() => setDate(subDays(new Date(), 1))}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
            isYesterday ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Yesterday
        </button>
      </div>

      <div className="space-y-6">
        {/* Daily Theme */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2 text-zinc-400">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Daily Theme / Focus</span>
          </div>
          {dayData.theme && !isEditingTheme ? (
            <div 
              onClick={() => {
                setThemeInput(dayData.theme!);
                setIsEditingTheme(true);
              }}
              className="text-lg font-medium text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors"
            >
              {dayData.theme}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTheme()}
                placeholder="e.g., Deep Work, Recovery, Family..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleSaveTheme}
                disabled={!themeInput.trim()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <form onSubmit={(e) => handleAdd(e)} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Studied math for 2 hours..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-4 pr-14 text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-xl flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Quick Tap Habits */}
          {frequentActivities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {frequentActivities.map((habit, i) => (
                <button
                  key={i}
                  onClick={() => handleAdd(undefined, habit)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/50 rounded-full text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  {habit}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-2xl"
              >
                <div className="flex-1 pr-4">
                  <span className="text-zinc-300">{activity.text}</span>
                  {activity.analysis ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        activity.analysis.points > 0 ? "bg-emerald-500/10 text-emerald-400" :
                        activity.analysis.points < 0 ? "bg-red-500/10 text-red-400" :
                        "bg-zinc-800 text-zinc-400"
                      )}>
                        {activity.analysis.points > 0 ? '+' : ''}{activity.analysis.points} pts
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>Pending analysis</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeActivity(dateStr, activity.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-2 -mr-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {activities.length === 0 && (
            <div className="text-center py-8 text-zinc-600 flex flex-col items-center">
              <Calendar className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm">No activities logged yet.</p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={unanalyzedActivities.length === 0 || isAnalyzing}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>
                {analyzedActivities.length > 0 
                  ? `Analyze ${unanalyzedActivities.length} New Activities` 
                  : 'Generate Daily Score'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

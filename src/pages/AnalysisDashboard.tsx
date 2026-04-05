import { useState, useEffect } from 'react';
import { format, isSameDay, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Share2, Check, TrendingUp, TrendingDown, Target, Brain, ArrowUpCircle, CalendarDays, Sparkles } from 'lucide-react';
import { useStore } from '@/src/store/useStore';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getOverallLevel, getIdentityLabel, getTraitLevel } from '@/src/lib/leveling';
import { generateWeeklyReview } from '@/src/lib/ai';

export function AnalysisDashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const { getDay, streak, overallTraits, weeklyReviews, addWeeklyReview, getAllActivities } = useStore();

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayData = getDay(dateStr);
  const { summary, activities } = dayData;
  const analyzedActivities = activities.filter(a => a.analysis);

  const handlePrevDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(subDays(date, -1));

  // Find if there's a weekly review for the selected date
  const weeklyReviewForDate = weeklyReviews.find(r => r.date === dateStr);

  const handleGenerateWeeklyReview = async () => {
    setIsGeneratingReview(true);
    try {
      // Get activities from the last 7 days up to the selected date
      const allActs = getAllActivities();
      const selectedTime = date.getTime();
      const sevenDaysAgo = selectedTime - (7 * 24 * 60 * 60 * 1000);
      
      const last7DaysActivities = allActs.filter(a => {
        const actTime = new Date(a.date).getTime();
        return actTime <= selectedTime && actTime > sevenDaysAgo;
      });

      const reviewText = await generateWeeklyReview(last7DaysActivities, overallTraits);
      addWeeklyReview({ date: dateStr, feedback: reviewText });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  // Calculate if there was a level up today
  let levelUpMessage = null;
  if (summary && summary.totalScore > 0) {
    const currentTotalXp = Object.values(overallTraits).reduce((a, b) => a + b, 0);
    const previousTotalXp = currentTotalXp - summary.totalScore;
    
    const currentLevel = getOverallLevel(currentTotalXp).level;
    const previousLevel = getOverallLevel(previousTotalXp).level;
    
    if (currentLevel > previousLevel) {
      const newIdentity = getIdentityLabel(currentLevel);
      const oldIdentity = getIdentityLabel(previousLevel);
      
      if (newIdentity !== oldIdentity) {
        levelUpMessage = `Incredible! You've reached Level ${currentLevel} and entered the ${newIdentity} phase.`;
      } else {
        levelUpMessage = `Level Up! You are now Level ${currentLevel}. You are becoming stronger and more disciplined.`;
      }
    } else {
      // Check for trait level ups
      for (const [trait, delta] of Object.entries(summary.traitsDelta)) {
        if (delta > 0) {
          const currentTraitXp = overallTraits[trait] || 0;
          const previousTraitXp = currentTraitXp - delta;
          if (getTraitLevel(currentTraitXp).level > getTraitLevel(previousTraitXp).level) {
            levelUpMessage = `Trait Level Up! You are becoming more ${trait.toLowerCase()} than before.`;
            break; // Just show one trait level up message to avoid clutter
          }
        }
      }
    }
  }

  const handleShare = async () => {
    if (!summary) return;
    
    const text = `LifeScore: ${summary.totalScore > 0 ? '+' : ''}${summary.totalScore} ${summary.totalScore > 0 ? '📈' : '📉'}\n` +
      `🔥 Streak: ${streak} days\n` +
      (dayData.theme ? `🎯 Theme: ${dayData.theme}\n` : '') +
      (summary.bestAction ? `⭐ Best: ${summary.bestAction}\n` : '') +
      (summary.worstHabit ? `⚠️ Worst: ${summary.worstHabit}\n` : '') +
      `\nTracked with LifeScore AI`;
    
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const isToday = isSameDay(date, new Date());

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50">
        <button onClick={handlePrevDay} className="p-3 hover:bg-zinc-800 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="font-medium">{isToday ? 'Today' : format(date, 'MMM d, yyyy')}</div>
        </div>
        <button 
          onClick={handleNextDay} 
          disabled={isToday}
          className="p-3 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-xl transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {weeklyReviewForDate ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <CalendarDays className="w-24 h-24 text-purple-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 font-medium tracking-wide uppercase text-xs">Weekly Analysis</span>
            </div>
            <p className="text-zinc-200 leading-relaxed text-lg font-medium">
              "{weeklyReviewForDate.feedback}"
            </p>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={handleGenerateWeeklyReview}
          disabled={isGeneratingReview}
          className="w-full py-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          {isGeneratingReview ? (
            <>
              <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              <span>Analyzing Week...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate Weekly Analysis</span>
            </>
          )}
        </button>
      )}

      {!summary ? (
        <div className="text-center py-20 text-zinc-500">
          <p>No analysis available for this date.</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Level Up Banner */}
          <AnimatePresence>
            {levelUpMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 p-[1px] rounded-2xl shadow-lg shadow-emerald-500/20"
              >
                <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-4">
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <ArrowUpCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-100 leading-relaxed">
                    {levelUpMessage}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Score Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex justify-between items-start absolute top-0 right-0">
                <button 
                  onClick={handleShare}
                  className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-colors text-zinc-400 hover:text-zinc-200"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-zinc-400 font-medium mb-2">Daily Score</p>
              <div className={cn(
                "text-6xl font-bold tracking-tighter mb-4",
                summary.totalScore > 0 ? "text-emerald-400" : summary.totalScore < 0 ? "text-red-400" : "text-zinc-300"
              )}>
                {summary.totalScore > 0 ? '+' : ''}{summary.totalScore}
              </div>
              <p className="text-zinc-300 leading-relaxed">{summary.summaryText}</p>
            </div>
          </div>

          {/* Identity Statement */}
          {summary.identityStatement && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
              <p className="text-emerald-400 font-medium italic">"{summary.identityStatement}"</p>
            </div>
          )}

          {/* Balance Meter */}
          {summary.productivePercent !== undefined && summary.harmfulPercent !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-zinc-400 px-1">
                <span>Productive ({summary.productivePercent}%)</span>
                <span>Harmful ({summary.harmfulPercent}%)</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${summary.productivePercent}%` }} 
                />
                <div 
                  className="h-full bg-red-500 transition-all duration-1000" 
                  style={{ width: `${summary.harmfulPercent}%` }} 
                />
              </div>
            </div>
          )}

          {/* Best & Worst */}
          <div className="grid grid-cols-2 gap-3">
            {summary.bestAction && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Best Action</span>
                </div>
                <p className="text-sm text-zinc-300">{summary.bestAction}</p>
              </div>
            )}
            {summary.worstHabit && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Worst Habit</span>
                </div>
                <p className="text-sm text-zinc-300">{summary.worstHabit}</p>
              </div>
            )}
          </div>

          {/* Reflection Question */}
          {summary.reflectionQuestion && (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 flex gap-4 items-start">
              <div className="p-2 bg-zinc-800 rounded-xl shrink-0">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-200 mb-1">Daily Reflection</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{summary.reflectionQuestion}</p>
              </div>
            </div>
          )}

          {/* Improvement Suggestions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-1">Insights & Tips</h3>
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 space-y-3">
              {summary.improvementSuggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <p className="text-zinc-300 text-sm leading-relaxed">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activities Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-1">Activity Breakdown</h3>
            <div className="space-y-2">
              {analyzedActivities.map((activity) => (
                <div key={activity.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-zinc-200 text-sm font-medium">{activity.text}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          activity.analysis!.category === 'Productive' ? "bg-emerald-500/10 text-emerald-400" :
                          activity.analysis!.category === 'Harmful' ? "bg-red-500/10 text-red-400" :
                          "bg-zinc-800 text-zinc-400"
                        )}>
                          {activity.analysis!.category}
                        </span>
                        <span className="text-[10px] text-zinc-500">{activity.analysis!.durationMinutes}m</span>
                        <span className="text-[10px] text-zinc-500">{activity.analysis!.quality} Quality</span>
                      </div>
                    </div>
                    <div className={cn(
                      "font-mono font-medium text-lg",
                      activity.analysis!.points > 0 ? "text-emerald-400" :
                      activity.analysis!.points < 0 ? "text-red-400" : "text-zinc-500"
                    )}>
                      {activity.analysis!.points > 0 ? '+' : ''}{activity.analysis!.points}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                    {activity.analysis!.reasoning}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

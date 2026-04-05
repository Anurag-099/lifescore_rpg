import { useState, useMemo } from 'react';
import { useStore } from '@/src/store/useStore';
import { format, parseISO, subDays, eachDayOfInterval, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function History({ onNavigate }: { onNavigate: (tab: 'analysis') => void }) {
  const { days } = useStore();
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('week');

  // Sort dates descending, only include days that have a summary
  const sortedDates = Object.keys(days)
    .filter(date => days[date].summary !== null)
    .sort((a, b) => b.localeCompare(a));

  // Generate Chart Data
  const chartData = useMemo(() => {
    const today = new Date();
    
    if (timeframe === 'week' || timeframe === 'month') {
      const daysCount = timeframe === 'week' ? 7 : 30;
      const start = subDays(today, daysCount - 1);
      const interval = eachDayOfInterval({ start, end: today });
      
      return interval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const summary = days[dateStr]?.summary;
        return {
          name: timeframe === 'week' ? format(date, 'EEE') : format(date, 'd MMM'),
          score: summary ? summary.totalScore : 0,
          fullDate: dateStr
        };
      });
    } else {
      // Year view (aggregate by month)
      const start = subMonths(startOfMonth(today), 11);
      const interval = eachMonthOfInterval({ start, end: today });
      
      return interval.map(date => {
        const monthStr = format(date, 'yyyy-MM');
        let monthScore = 0;
        
        Object.keys(days).forEach(d => {
          if (d.startsWith(monthStr) && days[d].summary) {
            monthScore += days[d].summary!.totalScore;
          }
        });

        return {
          name: format(date, 'MMM'),
          score: monthScore,
          fullDate: monthStr
        };
      });
    }
  }, [days, timeframe]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">History & Trends</h2>
        <p className="text-zinc-400 text-sm mt-1">Your recent daily scores</p>
      </div>

      {/* Chart Section */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-4 space-y-4">
        <div className="flex bg-zinc-950 rounded-xl p-1">
          {(['week', 'month', 'year'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors",
                timeframe === t ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10 }} 
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: '#27272a', opacity: 0.4 }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value: number) => [value > 0 ? `+${value}` : value, 'Score']}
                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              />
              <Bar dataKey="score" radius={[4, 4, 4, 4]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.score > 0 ? '#34d399' : entry.score < 0 ? '#f87171' : '#3f3f46'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p>No history available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((dateStr, index) => {
            const summary = days[dateStr].summary!;
            const dateObj = parseISO(dateStr);
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={dateStr}
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-200">{format(dateObj, 'MMM d, yyyy')}</p>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-1 max-w-[200px]">{summary.summaryText}</p>
                </div>
                <div className={cn(
                  "font-mono font-medium text-lg",
                  summary.totalScore > 0 ? "text-emerald-400" :
                  summary.totalScore < 0 ? "text-red-400" : "text-zinc-500"
                )}>
                  {summary.totalScore > 0 ? '+' : ''}{summary.totalScore}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

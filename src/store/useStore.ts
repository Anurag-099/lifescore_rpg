import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, differenceInDays } from 'date-fns';

export type ActivityCategory = 'Productive' | 'Neutral' | 'Harmful';

export type Traits = Record<string, number>;

export type ActivityAnalysis = {
  category: ActivityCategory;
  points: number;
  traitsAffected: Traits;
  durationMinutes: number;
  quality: 'Low' | 'Medium' | 'High';
  reasoning: string;
};

export type Activity = {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  analysis?: ActivityAnalysis;
};

export type DailySummary = {
  date: string; // YYYY-MM-DD
  totalScore: number;
  summaryText: string;
  improvementSuggestions: string[];
  traitsDelta: Traits;
  bestAction?: string;
  worstHabit?: string;
  identityStatement?: string;
  reflectionQuestion?: string;
  productivePercent?: number;
  harmfulPercent?: number;
};

export type DayData = {
  activities: Activity[];
  summary: DailySummary | null;
  theme?: string;
};

export type WeeklyReview = {
  date: string;
  feedback: string;
};

type AppState = {
  days: Record<string, DayData>;
  streak: number;
  lastStreakDate: string | null;
  overallTraits: Traits;
  customTraits: string[];
  hardMode: boolean;
  lastDecayDate: string | null;
  decayMessage: string | null;
  weeklyReviews: WeeklyReview[];
  
  addActivity: (date: string, activity: Activity) => void;
  removeActivity: (date: string, activityId: string) => void;
  updateDayAnalysis: (date: string, updatedActivities: Activity[], newSummary: DailySummary) => void;
  setTheme: (date: string, theme: string) => void;
  updateCustomTraits: (traits: string[]) => void;
  toggleHardMode: () => void;
  importData: (data: Partial<AppState>) => void;
  getDay: (date: string) => DayData;
  getAllActivities: () => Activity[];
  checkAndApplyDecay: () => void;
  clearDecayMessage: () => void;
  addWeeklyReview: (review: WeeklyReview) => void;
};

const DEFAULT_TRAITS = ['Discipline', 'Consistency', 'Focus', 'Health', 'Personal Growth'];

const initialTraits: Traits = DEFAULT_TRAITS.reduce((acc, trait) => ({ ...acc, [trait]: 0 }), {});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      days: {},
      streak: 0,
      lastStreakDate: null,
      overallTraits: initialTraits,
      customTraits: DEFAULT_TRAITS,
      hardMode: false,
      lastDecayDate: null,
      decayMessage: null,
      weeklyReviews: [],

      addActivity: (date, activity) => set((state) => {
        const day = state.days[date] || { activities: [], summary: null };
        return {
          days: {
            ...state.days,
            [date]: { ...day, activities: [...day.activities, activity] }
          }
        };
      }),

      removeActivity: (date, activityId) => set((state) => {
        const day = state.days[date];
        if (!day) return state;
        
        const activityToRemove = day.activities.find(a => a.id === activityId);
        if (!activityToRemove) return state;

        const newActivities = day.activities.filter(a => a.id !== activityId);
        let newSummary = day.summary;
        let newOverallTraits = { ...state.overallTraits };

        if (activityToRemove.analysis && newSummary) {
          newSummary = { ...newSummary };
          newSummary.totalScore -= activityToRemove.analysis.points;
          
          const newTraitsDelta = { ...newSummary.traitsDelta };
          Object.keys(newTraitsDelta).forEach(key => {
            newTraitsDelta[key] -= activityToRemove.analysis!.traitsAffected[key] || 0;
            newOverallTraits[key] = (newOverallTraits[key] || 0) - (activityToRemove.analysis!.traitsAffected[key] || 0);
          });
          newSummary.traitsDelta = newTraitsDelta;
        }

        if (newActivities.length === 0) {
          newSummary = null;
        }

        return {
          days: {
            ...state.days,
            [date]: { ...day, activities: newActivities, summary: newSummary }
          },
          overallTraits: newOverallTraits
        };
      }),

      updateDayAnalysis: (date, updatedActivities, newSummary) => set((state) => {
        const day = state.days[date] || { activities: [], summary: null };
        const oldSummary = day.summary;
        
        // Calculate new overall traits by removing old summary's delta and adding new summary's delta
        const newTraits = { ...state.overallTraits };
        if (oldSummary) {
          Object.keys(oldSummary.traitsDelta).forEach((key) => {
            newTraits[key] = (newTraits[key] || 0) - oldSummary.traitsDelta[key];
          });
        }
        Object.keys(newSummary.traitsDelta).forEach((key) => {
          newTraits[key] = (newTraits[key] || 0) + newSummary.traitsDelta[key];
        });

        // Update streak
        let newStreak = state.streak;
        let newLastStreakDate = state.lastStreakDate;
        
        if (newSummary.totalScore > 0) {
          if (!state.lastStreakDate) {
            newStreak = 1;
            newLastStreakDate = date;
          } else {
            const daysDiff = differenceInDays(new Date(date), new Date(state.lastStreakDate));
            if (daysDiff === 1) {
              newStreak += 1;
              newLastStreakDate = date;
            } else if (daysDiff > 1 && newStreak === 0) {
              newStreak = 1;
              newLastStreakDate = date;
            }
          }
        } else if (newSummary.totalScore < 0 && date === format(new Date(), 'yyyy-MM-dd')) {
          // Break streak if negative day today
          newStreak = 0;
          newLastStreakDate = null;
        }

        return {
          days: {
            ...state.days,
            [date]: { ...day, activities: updatedActivities, summary: newSummary }
          },
          overallTraits: newTraits,
          streak: newStreak,
          lastStreakDate: newLastStreakDate,
        };
      }),

      setTheme: (date, theme) => set((state) => {
        const day = state.days[date] || { activities: [], summary: null };
        return {
          days: {
            ...state.days,
            [date]: { ...day, theme }
          }
        };
      }),

      updateCustomTraits: (traits) => set((state) => {
        const newOverallTraits = { ...state.overallTraits };
        traits.forEach(t => {
          if (newOverallTraits[t] === undefined) {
            newOverallTraits[t] = 0;
          }
        });
        return { customTraits: traits, overallTraits: newOverallTraits };
      }),

      toggleHardMode: () => set((state) => ({ hardMode: !state.hardMode })),

      importData: (data) => set((state) => {
        return { ...state, ...data };
      }),

      getDay: (date) => get().days[date] || { activities: [], summary: null },
      
      getAllActivities: () => {
        const days = get().days;
        return Object.values(days).flatMap(d => d.activities);
      },

      clearDecayMessage: () => set({ decayMessage: null }),

      addWeeklyReview: (review) => set((state) => ({
        weeklyReviews: [...state.weeklyReviews, review]
      })),

      checkAndApplyDecay: () => set((state) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        if (state.lastDecayDate === today) return state;

        const dates = Object.keys(state.days).sort();
        if (dates.length === 0) return { lastDecayDate: today };

        const lastActivityDate = dates[dates.length - 1];
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysSince = Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / msPerDay);

        if (daysSince >= 2) {
          const newTraits = { ...state.overallTraits };
          let decayed = false;
          for (const trait in newTraits) {
            if (newTraits[trait] > 0) {
              newTraits[trait] = Math.max(0, Math.floor(newTraits[trait] * 0.95)); // 5% decay
              decayed = true;
            }
          }
          if (decayed) {
            return {
              overallTraits: newTraits,
              lastDecayDate: today,
              decayMessage: "You are losing momentum. Inactivity has caused a slight drop in your traits."
            };
          }
        }
        return { lastDecayDate: today, decayMessage: null };
      }),
    }),
    {
      name: 'lifescore-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || version === 1) {
          // Migrate old state to new state
          const oldSummaries = persistedState.summaries || {};
          const newDays: Record<string, DayData> = {};
          Object.keys(oldSummaries).forEach(date => {
            newDays[date] = {
              activities: oldSummaries[date].activities || [],
              summary: {
                date: oldSummaries[date].date,
                totalScore: oldSummaries[date].totalScore,
                summaryText: oldSummaries[date].summaryText,
                improvementSuggestions: oldSummaries[date].improvementSuggestions,
                traitsDelta: oldSummaries[date].traitsDelta,
              }
            };
          });
          return {
            ...persistedState,
            days: newDays,
            summaries: undefined // clean up
          };
        }
        return persistedState;
      }
    }
  )
);

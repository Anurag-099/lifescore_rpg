import { GoogleGenAI, Type } from '@google/genai';
import { Activity, DailySummary, Traits } from '../store/useStore';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

export async function generateWeeklyReview(activities: Activity[], traits: Traits): Promise<string> {
  const prompt = `
You are a strict but fair AI mentor.
Analyze the user's last 7 days of activities.
Identify:
1. Strongest trait
2. Weakest trait
3. Most harmful pattern

Output short, strict feedback like a mentor (max 2 sentences).
Example: "You are disciplined but lack consistency due to late-night distractions."

Activities:
${activities.map(a => `- ${a.text} (Category: ${a.analysis?.category}, Points: ${a.analysis?.points})`).join('\n')}

Current Traits:
${Object.entries(traits).map(([k, v]) => `${k}: ${v} XP`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.2 }
    });

    return response.text?.trim() || "Keep pushing forward. Consistency is key.";
  } catch (error) {
    console.error("Weekly review generation failed:", error);
    return "Keep pushing forward. Consistency is key.";
  }
}

const BASE_SCORES: Record<string, number> = {
  'Study': 10,
  'Exercise': 8,
  'Walking': 5,
  'Learning': 9,
  'General Productive': 5,
  'Social Media': -6,
  'Gaming': -8,
  'Porn': -12,
  'General Harmful': -5,
  'Neutral': 0,
};

const QUALITY_MULTIPLIER: Record<string, number> = {
  'Deep': 1.5,
  'Normal': 1.0,
  'Distracted': 0.6,
};

export async function analyzeDayIncremental(
  date: string, 
  newActivities: Activity[], 
  previousActivities: Activity[],
  previousSummary: DailySummary | null,
  theme?: string,
  customTraits: string[] = ['Discipline', 'Consistency', 'Focus', 'Health', 'Personal Growth'],
  hardMode: boolean = false
): Promise<{ updatedActivities: Activity[], newSummary: DailySummary }> {
  
  const prompt = `
You are an AI life coach and productivity analyzer.
The user is logging their activities for ${date}.
${theme ? `\nThe user's main theme/focus for today is: "${theme}". Keep this in mind when writing the mentorFeedback and improvementSuggestions.\n` : ''}
${previousActivities.length > 0 ? `Previously analyzed activities today:
${previousActivities.map(a => `- ${a.text}`).join('\n')}
` : ''}

NEW activities to analyze:
${newActivities.map(a => `- ${a.text}`).join('\n')}

Task 1: Extract structured data for EACH NEW activity.
- category: 'Productive', 'Neutral', or 'Harmful'
- baseActivityType: Categorize into one of: 'Study', 'Exercise', 'Learning', 'Walking', 'Social Media', 'Gaming', 'Porn', 'General Productive', 'General Harmful', 'Neutral'
- durationMinutes: Extract duration if mentioned (e.g., "5hrs" = 300, "1 hr" = 60), otherwise default to 30.
- quality: 'Deep', 'Normal', or 'Distracted'.
- affectedTraitNames: An array of 1 to 3 trait names from this list: [${customTraits.join(', ')}] that this activity impacts.
- reasoning: A short 1-sentence explanation of WHY this category and quality were chosen.

Task 2: Provide an UPDATED overall daily summary considering ALL activities (previous + new).
- mentorFeedback: A short 1-2 sentence strict but fair mentor feedback.
- improvementSuggestions: 2-3 actionable tips.
- bestAction: The best thing they did today (short phrase).
- worstHabit: The worst thing they did today (short phrase).
- identityStatement: A daily identity statement (e.g., "You behaved like a disciplined student today").
- reflectionQuestion: A short question to prompt reflection for tomorrow.

Return strictly matching the JSON schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mentorFeedback: { type: Type.STRING },
          improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          bestAction: { type: Type.STRING },
          worstHabit: { type: Type.STRING },
          identityStatement: { type: Type.STRING },
          reflectionQuestion: { type: Type.STRING },
          newActivitiesData: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, enum: ['Productive', 'Neutral', 'Harmful'] },
                baseActivityType: { type: Type.STRING, enum: ['Study', 'Exercise', 'Learning', 'Walking', 'Social Media', 'Gaming', 'Porn', 'General Productive', 'General Harmful', 'Neutral'] },
                durationMinutes: { type: Type.NUMBER },
                quality: { type: Type.STRING, enum: ['Deep', 'Normal', 'Distracted'] },
                affectedTraitNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                reasoning: { type: Type.STRING },
              },
              required: ['category', 'baseActivityType', 'durationMinutes', 'quality', 'affectedTraitNames', 'reasoning'],
            },
          },
        },
        required: ['mentorFeedback', 'improvementSuggestions', 'bestAction', 'worstHabit', 'identityStatement', 'reflectionQuestion', 'newActivitiesData'],
      },
    },
  });

  const data = JSON.parse(response.text || '{}');
  
  // SYSTEM: Calculate scores using fixed algorithm
  const analyzedNewActivities = newActivities.map((activity, index) => {
    const aiData = data.newActivitiesData[index];
    if (!aiData) return activity;

    const baseScore = BASE_SCORES[aiData.baseActivityType] || 0;
    const hours = aiData.durationMinutes / 60;
    const timeFactor = Math.max(0.5, Math.log10(1 + hours) * 3); // Scale log10 to be meaningful
    const qualityMult = QUALITY_MULTIPLIER[aiData.quality] || 1.0;

    let points = baseScore * timeFactor * qualityMult;

    // Negative Bias Rule
    if (aiData.category === 'Harmful') {
      points = points * 1.5;
    }

    // Hard Mode
    if (hardMode) {
      if (points > 0) points *= 0.8;
      if (points < 0) points *= 1.5;
    }

    points = Math.round(points);

    // Calculate Traits
    const traitsAffected: Traits = {};
    if (aiData.affectedTraitNames && aiData.affectedTraitNames.length > 0) {
      const pointsPerTrait = Math.round(points / aiData.affectedTraitNames.length);
      aiData.affectedTraitNames.forEach((traitName: string) => {
        if (customTraits.includes(traitName)) {
          traitsAffected[traitName] = pointsPerTrait;
        }
      });
    }

    return {
      ...activity,
      analysis: {
        category: aiData.category,
        points,
        durationMinutes: aiData.durationMinutes,
        quality: aiData.quality,
        reasoning: aiData.reasoning,
        traitsAffected,
      }
    };
  });

  const allActivities = [...previousActivities, ...analyzedNewActivities];

  // Calculate new totals
  let totalScore = 0;
  let productivePoints = 0;
  let harmfulPoints = 0;
  const traitsDelta: Traits = customTraits.reduce((acc, trait) => ({ ...acc, [trait]: 0 }), {});

  allActivities.forEach(a => {
    if (a.analysis) {
      totalScore += a.analysis.points;
      
      if (a.analysis.points > 0) productivePoints += a.analysis.points;
      if (a.analysis.points < 0) harmfulPoints += Math.abs(a.analysis.points);

      Object.keys(traitsDelta).forEach(key => {
        traitsDelta[key] += a.analysis!.traitsAffected[key] || 0;
      });
    }
  });

  // Calculate Balance Meter
  const totalAbsolutePoints = productivePoints + harmfulPoints;
  const productivePercent = totalAbsolutePoints === 0 ? 50 : Math.round((productivePoints / totalAbsolutePoints) * 100);
  const harmfulPercent = totalAbsolutePoints === 0 ? 50 : 100 - productivePercent;

  const newSummary: DailySummary = {
    date,
    totalScore,
    summaryText: data.mentorFeedback,
    improvementSuggestions: data.improvementSuggestions,
    traitsDelta,
    bestAction: data.bestAction,
    worstHabit: data.worstHabit,
    identityStatement: data.identityStatement,
    reflectionQuestion: data.reflectionQuestion,
    productivePercent,
    harmfulPercent,
  };

  return {
    updatedActivities: allActivities,
    newSummary
  };
}

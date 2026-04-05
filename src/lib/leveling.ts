export function getOverallLevel(totalXP: number) {
  if (totalXP <= 0) {
    return { level: 1, currentXP: totalXP, nextLevelXP: 50, progressPercent: 0 };
  }

  let level = 1;
  let xpNeededForNext = 50 * Math.pow(level, 1.2);
  let xpRemaining = totalXP;

  while (xpRemaining >= xpNeededForNext) {
    xpRemaining -= xpNeededForNext;
    level++;
    xpNeededForNext = 50 * Math.pow(level, 1.2);
  }

  const progressPercent = Math.max(0, Math.min(100, (xpRemaining / xpNeededForNext) * 100));

  return { 
    level, 
    currentXP: Math.round(xpRemaining), 
    nextLevelXP: Math.round(xpNeededForNext), 
    progressPercent 
  };
}

export function getTraitLevel(totalXP: number) {
  if (totalXP <= 0) {
    return { level: 1, currentXP: totalXP, nextLevelXP: 50, progressPercent: 0 };
  }

  const level = Math.floor(totalXP / 50) + 1;
  const currentXP = totalXP % 50;
  const nextLevelXP = 50;
  const progressPercent = (currentXP / nextLevelXP) * 100;

  return {
    level,
    currentXP: Math.round(currentXP),
    nextLevelXP,
    progressPercent
  };
}

export function getIdentityLabel(level: number) {
  if (level < 10) return 'Beginner';
  if (level < 25) return 'Consistent';
  if (level < 50) return 'Disciplined';
  if (level < 75) return 'Elite';
  if (level < 100) return 'Master';

  if (level < 130) {
    const tier = Math.floor((level - 100) / 10) + 1;
    return `Legend ${tier === 1 ? 'I' : tier === 2 ? 'II' : 'III'}`;
  }
  if (level < 160) {
    const tier = Math.floor((level - 130) / 10) + 1;
    return `Mythic ${tier === 1 ? 'I' : tier === 2 ? 'II' : 'III'}`;
  }

  const tier = Math.floor((level - 160) / 10) + 1;
  return `Ascended ${tier}`;
}

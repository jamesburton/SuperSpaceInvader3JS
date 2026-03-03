import type { WaveConfig } from './waveConfig';
import { WAVE_CONFIGS } from './waveConfig';

/**
 * A single level within a campaign chapter.
 * Levels may specify explicit waves or use the algorithmic fallback.
 */
export interface CampaignLevel {
  levelNumber: number;       // 1-based
  title: string;             // displayed in briefing header
  briefingText: string;      // 2-3 sentence atmospheric paragraph
  waves?: WaveConfig[];      // explicit wave list; if omitted, use getAlgorithmicWaves()
  waveCount?: number;        // defaults to 3 if waves is omitted
  hasBoss: boolean;          // if true, boss encounter triggers after all waves clear
}

/**
 * A chapter groups multiple campaign levels under a common narrative arc.
 */
export interface CampaignChapter {
  chapterNumber: number;
  title: string;
  levels: CampaignLevel[];
}

/**
 * Algorithmic wave fallback for un-authored levels.
 * Cycles through WAVE_CONFIGS with escalating difficulty based on level index.
 * Used when a CampaignLevel omits its `waves` array.
 */
export function getAlgorithmicWaves(levelIndex: number, waveCount: number): WaveConfig[] {
  const result: WaveConfig[] = [];
  for (let i = 0; i < waveCount; i++) {
    const cycleIndex = (levelIndex * waveCount + i) % WAVE_CONFIGS.length;
    const base = WAVE_CONFIGS[cycleIndex];
    const escalation = 1 + levelIndex * 0.15;
    result.push({
      ...base,
      waveNumber: levelIndex * waveCount + i + 1,
      speedMultiplier: base.speedMultiplier * escalation,
      fireRateMultiplier: base.fireRateMultiplier * escalation,
      hpMultiplier: base.hpMultiplier * escalation,
      shopAfterThisWave: i === waveCount - 1,
    });
  }
  return result;
}

/**
 * Chapter 1: The Neon Offensive — 4 levels building to the Sentinel boss.
 */
export const CAMPAIGN_CHAPTER_1: CampaignChapter = {
  chapterNumber: 1,
  title: 'The Neon Offensive',
  levels: [
    {
      levelNumber: 1,
      title: 'Breach Point',
      briefingText:
        'Commander, enemy forces have locked down Sector 7. Three grunt formations hold the corridor. Break through — we need that data node.',
      waves: [WAVE_CONFIGS[0], WAVE_CONFIGS[1], WAVE_CONFIGS[2]],
      hasBoss: false,
    },
    {
      levelNumber: 2,
      title: 'Shield Wall',
      briefingText:
        'The Shielders have formed a kill-box at the central plaza. Their frontal barriers are near-impenetrable — target the flanks. Four waves stand between you and the relay tower.',
      waves: [WAVE_CONFIGS[3], WAVE_CONFIGS[4], WAVE_CONFIGS[5], WAVE_CONFIGS[6]],
      hasBoss: false,
    },
    {
      levelNumber: 3,
      title: 'Precision Strike',
      briefingText:
        'Snipers have taken elevated positions. Three elite formations — faster, sharper, more coordinated. Stay mobile. The Core lies beyond.',
      waves: [WAVE_CONFIGS[7], WAVE_CONFIGS[8], WAVE_CONFIGS[9]],
      hasBoss: false,
    },
    {
      levelNumber: 4,
      title: 'The Sentinel',
      briefingText:
        'The Sentinel AI is online. It commands everything. We have one shot at this, Commander. One.',
      waves: [WAVE_CONFIGS[10], WAVE_CONFIGS[11]],
      hasBoss: true,
    },
  ],
};

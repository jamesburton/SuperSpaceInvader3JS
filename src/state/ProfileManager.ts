import { useMetaStore } from './MetaState';

// ---------------------------------------------------------------------------
// Profile index — stored separately from per-profile game data
// ---------------------------------------------------------------------------

const PROFILE_INDEX_KEY = 'ssi-profiles';

export interface ProfileIndex {
  activeProfile: string;
  profiles: string[];          // all profile names
  hiddenProfiles: string[];    // profiles hidden from high score table
}

function loadIndex(): ProfileIndex | null {
  try {
    const raw = localStorage.getItem(PROFILE_INDEX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProfileIndex;
  } catch {
    return null;
  }
}

function saveIndex(index: ProfileIndex): void {
  localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(index));
}

function storageKeyForProfile(name: string): string {
  // Zustand persist middleware uses this key pattern
  return `ssi-meta-${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

// ---------------------------------------------------------------------------
// High score entry
// ---------------------------------------------------------------------------

const HIGH_SCORES_KEY = 'ssi-highscores';

export interface HighScoreEntry {
  name: string;
  score: number;
  wave: number;
  mode: string;
  date: string;
}

/** Default high scores — funny names for players to beat */
const DEFAULT_HIGH_SCORES: HighScoreEntry[] = [
  { name: 'ACE', score: 50000, wave: 25, mode: 'endless', date: '1983-07-01' },
  { name: 'ZAP', score: 35000, wave: 18, mode: 'endless', date: '1984-02-14' },
  { name: 'NOM', score: 25000, wave: 14, mode: 'endless', date: '1985-12-25' },
  { name: 'LOL', score: 18000, wave: 11, mode: 'endless', date: '1986-04-01' },
  { name: 'GIT GUD', score: 12000, wave: 8, mode: 'endless', date: '1987-10-31' },
  { name: 'NOOB', score: 8000, wave: 6, mode: 'endless', date: '1988-06-15' },
  { name: 'CPU', score: 5000, wave: 4, mode: 'endless', date: '1989-01-01' },
  { name: 'BOT', score: 3000, wave: 3, mode: 'endless', date: '1990-08-08' },
  { name: '???', score: 1500, wave: 2, mode: 'endless', date: '1991-03-14' },
  { name: 'NEW', score: 500, wave: 1, mode: 'endless', date: '1992-11-22' },
];

function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return [...DEFAULT_HIGH_SCORES];
    return JSON.parse(raw) as HighScoreEntry[];
  } catch {
    return [...DEFAULT_HIGH_SCORES];
  }
}

function saveHighScores(scores: HighScoreEntry[]): void {
  localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
}

// ---------------------------------------------------------------------------
// ProfileManager — singleton
// ---------------------------------------------------------------------------

/** The Zustand persist middleware key used by the ACTIVE profile */
const ACTIVE_META_KEY = 'ssi-meta-v1';

export const profileManager = {
  /** Returns the profile index, creating a default if needed */
  getIndex(): ProfileIndex {
    const existing = loadIndex();
    if (existing) return existing;
    // No index yet — create one with current data as default profile
    return { activeProfile: '', profiles: [], hiddenProfiles: [] };
  },

  /** Returns true if a player name has been set */
  hasActiveProfile(): boolean {
    const idx = loadIndex();
    return idx !== null && idx.activeProfile !== '';
  },

  /** Get the active player name */
  getActiveProfileName(): string {
    return loadIndex()?.activeProfile ?? '';
  },

  /** Get list of all profile names */
  getAllProfiles(): string[] {
    return loadIndex()?.profiles ?? [];
  },

  /**
   * Create a new profile and switch to it.
   * Current state is saved first if there's an existing profile.
   */
  createProfile(name: string): void {
    const idx = this.getIndex();

    // Save current profile data if one exists
    if (idx.activeProfile) {
      this._saveCurrentProfile(idx.activeProfile);
    }

    // Reset meta store to defaults for the new profile
    this._resetMetaStore();

    // Update index
    if (!idx.profiles.includes(name)) {
      idx.profiles.push(name);
    }
    idx.activeProfile = name;
    saveIndex(idx);
  },

  /**
   * Switch to an existing profile.
   */
  switchProfile(name: string): void {
    const idx = this.getIndex();
    if (!idx.profiles.includes(name)) return;

    // Save current profile
    if (idx.activeProfile && idx.activeProfile !== name) {
      this._saveCurrentProfile(idx.activeProfile);
    }

    // Load target profile data
    const key = storageKeyForProfile(name);
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        // Replace the active Zustand persist key with this profile's data
        localStorage.setItem(ACTIVE_META_KEY, raw);
        // Force Zustand to reload from storage by replacing state
        const state = data.state ?? data;
        useMetaStore.setState(state);
      } catch {
        // If loading fails, keep current state
      }
    } else {
      // Profile exists in index but has no saved data — reset to defaults
      this._resetMetaStore();
    }

    idx.activeProfile = name;
    saveIndex(idx);
  },

  /**
   * Migrate existing data: if player has existing MetaStore data but no profile,
   * assign it to the given name.
   */
  adoptExistingData(name: string): void {
    const idx = this.getIndex();
    if (!idx.profiles.includes(name)) {
      idx.profiles.push(name);
    }
    idx.activeProfile = name;
    saveIndex(idx);
    // Save the current MetaStore data under this profile name
    this._saveCurrentProfile(name);
  },

  /** Save current Zustand MetaStore to the named profile's storage key */
  _saveCurrentProfile(name: string): void {
    const key = storageKeyForProfile(name);
    const currentRaw = localStorage.getItem(ACTIVE_META_KEY);
    if (currentRaw) {
      localStorage.setItem(key, currentRaw);
    }
  },

  /** Reset MetaStore to fresh defaults (partial replace — keeps method refs) */
  _resetMetaStore(): void {
    useMetaStore.setState({
      saveVersion: 4,
      metaCurrency: 0,
      highScore: 0,
      purchasedUpgrades: [],
      bunkersEnabled: true,
      campaignProgress: {},
      briefingAutoDismiss: false,
      volume: 0.8,
      muted: false,
      selectedSkin: { shapeId: 'default', colorId: 'white' },
      crtTier: null,
      crtIntensity: 0.5,
      difficulty: 'normal' as const,
      startingPowerUp: null,
      extraLivesPurchased: 0,
    });
  },

  // -----------------------------------------------------------------------
  // High Scores
  // -----------------------------------------------------------------------

  /** Get all high scores sorted descending */
  getHighScores(): HighScoreEntry[] {
    return loadHighScores().sort((a, b) => b.score - a.score);
  },

  /** Record a new high score entry */
  recordScore(name: string, score: number, wave: number, mode: string): void {
    if (score <= 0) return;
    const scores = loadHighScores();
    scores.push({
      name,
      score,
      wave,
      mode,
      date: new Date().toISOString().slice(0, 10),
    });
    // Keep top 50
    scores.sort((a, b) => b.score - a.score);
    saveHighScores(scores.slice(0, 50));
  },

  // -----------------------------------------------------------------------
  // Profile visibility (hide/show on high score table)
  // -----------------------------------------------------------------------

  /** Get hidden profile names */
  getHiddenProfiles(): string[] {
    return loadIndex()?.hiddenProfiles ?? [];
  },

  /** Hide a profile from the high score table */
  hideProfile(name: string): void {
    const idx = this.getIndex();
    if (!idx.hiddenProfiles.includes(name)) {
      idx.hiddenProfiles.push(name);
      saveIndex(idx);
    }
  },

  /** Show a previously hidden profile on the high score table */
  showProfile(name: string): void {
    const idx = this.getIndex();
    idx.hiddenProfiles = idx.hiddenProfiles.filter(n => n !== name);
    saveIndex(idx);
  },

  /** Save current profile on session events (call before page unload or state transitions) */
  saveCurrentState(): void {
    const idx = loadIndex();
    if (idx?.activeProfile) {
      this._saveCurrentProfile(idx.activeProfile);
    }
  },
};

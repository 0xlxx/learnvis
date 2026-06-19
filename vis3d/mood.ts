// vis3d/mood.ts — MoodContext: visual style presets for different age groups
//
// Each mood bundles material parameters, label styling, and grid opacity.
// Lighting is handled separately in bootstrap.ts (mood-aware switch).
// Themes are in vis/themes.ts.

/** Visual style preset for a specific age group / aesthetic. */
export interface MoodContext {
  readonly name: string;
  /** Standard material roughness (0=glossy, 1=matte). */
  readonly roughness: number;
  /** Standard material metalness (0=non-metallic). */
  readonly metalness: number;
  /** If set, use MeshToonMaterial with this many tone bands instead of MeshStandardMaterial. */
  readonly toonBands?: number;
  /** CSS label styling. */
  readonly label: {
    readonly font: string;
    readonly color: string;
    readonly shadow: string;
  };
  /** Grid line opacity. */
  readonly gridOpacity: number;
}

export const MOODS: Record<string, MoodContext> = {
  playful: {
    name: 'playful',
    roughness: 0.5,
    metalness: 0,
    toonBands: 3,
    label: {
      font: '600 16px system-ui, -apple-system, sans-serif',
      color: '#2d1f10',
      shadow: '0 0 6px rgba(255,255,255,0.9), 0 0 2px rgba(255,255,255,0.95)',
    },
    gridOpacity: 0.35,
  },
  clean: {
    name: 'clean',
    roughness: 0.7,
    metalness: 0,
    label: {
      font: '600 14px system-ui, -apple-system, sans-serif',
      color: '#1e1e1e',
      shadow: '0 0 6px rgba(255,255,255,0.95), 0 0 2px rgba(255,255,255,0.95), 0 0 10px rgba(255,255,255,0.6)',
    },
    gridOpacity: 0.35,
  },
  minimal: {
    name: 'minimal',
    roughness: 0.85,
    metalness: 0,
    label: {
      font: '500 14px "Georgia", "Times New Roman", serif',
      color: '#1a1a1a',
      shadow: 'none',
    },
    gridOpacity: 0.28,
  },
  sketch: {
    name: 'sketch',
    roughness: 0.4,
    metalness: 0,
    toonBands: 2,
    label: {
      font: 'italic 500 16px system-ui, -apple-system, sans-serif',
      color: '#f0f0e0',
      shadow: '0 0 8px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.7)',
    },
    gridOpacity: 0.3,
  },
};

/** Resolve mood name to MoodContext. Falls back to 'clean'. */
export function resolveMood(name?: string): MoodContext {
  return MOODS[name ?? 'clean'] ?? MOODS.clean!;
}

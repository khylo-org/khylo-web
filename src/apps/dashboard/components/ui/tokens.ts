/**
 * Khylo Server Administration Design System Tokens
 * Strict Calico Palette: Warm Orange accent, Deep Charcoal surfaces, Warm White typography.
 * No AI gimmicks, no neon glow, no random cards.
 */

export const KHYLO_COLORS = {
    // Core surfaces
    bgApp: '#0C0C0E',
    surfacePrimary: '#141418',
    surfaceSecondary: '#1C1C22',
    surfaceElevated: '#24242C',
    surfaceHover: 'rgba(255, 255, 255, 0.04)',
    surfaceActive: 'rgba(217, 119, 50, 0.12)',

    // Borders & dividers
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderDefault: 'rgba(255, 255, 255, 0.10)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
    borderAccent: '#D97732',

    // Calico Brand Accent
    accent: '#D97732',
    accentHover: '#E5833D',
    accentMuted: 'rgba(217, 119, 50, 0.16)',

    // Text & Content
    textPrimary: '#FAF8F5',
    textSecondary: 'rgba(250, 248, 245, 0.65)',
    textMuted: 'rgba(250, 248, 245, 0.40)',
    textInverse: '#0C0C0E',

    // Status Semantics
    status: {
        healthy: {
            fg: '#34D399',
            bg: 'rgba(52, 211, 153, 0.12)',
            border: 'rgba(52, 211, 153, 0.25)'
        },
        warning: {
            fg: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.25)'
        },
        danger: {
            fg: '#EF4444',
            bg: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.25)'
        },
        info: {
            fg: '#38BDF8',
            bg: 'rgba(56, 189, 248, 0.12)',
            border: 'rgba(56, 189, 248, 0.25)'
        },
        idle: {
            fg: '#94A3B8',
            bg: 'rgba(148, 163, 184, 0.10)',
            border: 'rgba(148, 163, 184, 0.20)'
        }
    }
} as const;

export const KHYLO_TYPOGRAPHY = {
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
} as const;

export const KHYLO_SPACING = {
    sidebarWidth: 260,
    headerHeight: 56,
    contentPadding: 28,
    radiusSm: 4,
    radiusMd: 8,
    radiusLg: 12
} as const;

/**
 * KHYLO DESIGN SYSTEM TOKENS
 * Spec: Sections 2-9, 66-71, 109-112
 */

export const KHYLO_COLORS = {
    // Surface & Depth System (Specs 7-8, 130-135)
    bgFoundation: '#090A0B',
    bgPrimary: '#090A0B',
    bgSecondary: '#0E0F10',
    bgSurface2: '#121314',
    bgElevated: '#151516',
    bgSurface3: '#171819',

    // Liquid Glass Formula (Specs 8, 9, 11)
    bgGlass: 'rgba(18, 19, 20, 0.55)',
    bgGlassFilter: 'blur(24px) saturate(120%)',
    bgGlassBorder: '1px solid rgba(255, 255, 255, 0.07)',
    bgGlassShadow: '0 12px 40px rgba(0, 0, 0, 0.28)',

    // Gradients & Ambient Dissolves (Specs 35, 83)
    bgCardOverlay: 'linear-gradient(180deg, rgba(9, 10, 11, 0) 0%, rgba(9, 10, 11, 0.85) 100%)',
    bgHeroGradient: 'linear-gradient(90deg, rgba(9, 10, 11, 0.96) 0%, rgba(9, 10, 11, 0.72) 45%, rgba(9, 10, 11, 0) 85%)',
    bgHeroBottomFade: 'linear-gradient(180deg, rgba(9, 10, 11, 0) 0%, rgba(9, 10, 11, 0.85) 60%, #090A0B 100%)',

    // Calico Typography (Specs 6, 134)
    textPrimary: '#F4F1EC',
    textSecondary: '#B4AEA7',
    textMuted: '#858079',

    // Signature Orange (Restrained per Spec 6)
    orange: '#D97732',
    orangeHover: '#B85F22',
    orangeActive: '#964817',
    orangeSubtle: 'rgba(217, 119, 50, 0.14)',
    orangeGlow: 'rgba(217, 119, 50, 0.25)',

    // Borders (Spec 13)
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderNormal: 'rgba(255, 255, 255, 0.07)',
    borderHover: 'rgba(255, 255, 255, 0.10)',
    borderFocus: '#D97732',

    // Semantic States
    error: '#E5484D',
    success: '#3F7D58',
    warning: '#B7791F',
    info: '#4F6F8F'
} as const;

export const KHYLO_LIQUID_GLASS = {
    background: 'rgba(18, 19, 20, 0.55)',
    backdropFilter: 'blur(24px) saturate(120%)',
    WebkitBackdropFilter: 'blur(24px) saturate(120%)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.28)'
} as const;

export const KHYLO_SPACING = {
    xxs: 4,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    huge: 64,
    massive: 80
} as const;

export const KHYLO_RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    hero: 20,
    pill: 9999
} as const;

export const KHYLO_SHADOWS = {
    subtle: '0 2px 8px rgba(0, 0, 0, 0.35)',
    elevated: '0 8px 24px rgba(0, 0, 0, 0.45)',
    floating: '0 16px 40px rgba(0, 0, 0, 0.65)',
    deep: '0 24px 64px rgba(0, 0, 0, 0.8)'
} as const;

export const KHYLO_LAYOUT = {
    railCollapsedWidth: 80,
    railExpandedWidth: 215, // Desktop target strictly 210-225px per Spec 17
    headerHeight: 68,
    searchWidth: 560, // Desktop width 500-600px per Spec 26
    contentMaxWidth: 1920
} as const;


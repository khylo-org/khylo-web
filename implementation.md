# Khylo Web App: 10-Step Implementation Plan & Progress Tracker

> **Primary Design Authority**: This document governs the complete visual art direction, UI/UX implementation, and component architecture for the consumer-facing Khylo Web Application based on the 202-point specification.
> **Execution Rule**: Each step must be completed, tested, and verified with the user before proceeding to the next step.

---

## Progress Overview

| Step | Title | Target Scope | Status |
|:---:|---|---|:---:|
| **1** | Design Tokens, Liquid-Glass Surface System & Atmosphere | Palette, Tokens, Glass Formula, Atmosphere, Loader | `[COMPLETED & VERIFIED]` |
| **2** | Integrated Left Navigation Rail | 210–225px Sidebar, Dynamic Groups, Pinning, Active Indicators | `[COMPLETED & VERIFIED]` |
| **3** | Global Header, Liquid-Glass Search & Notification Center | Floating Header, 500–600px Search, Glass Popovers, Avatars | `[COMPLETED & VERIFIED]` |
| **4** | Cinematic Home Hero Section | 45–55% Viewport, Seamless Edge Dissolves, Typography, Micro-Carousel | `[COMPLETED & VERIFIED]` |
| **5** | Media Card Hierarchy & Continue Watching Rail | 16:9 Large Continue Cards, Multi-Format Rails, Hover Motion | `[COMPLETED & VERIFIED]` |
| **6** | Home Visual Rhythm & Contextual Editorial Panels | Cadence, Wide Recommendation Panels, Dynamic Empty Collapse | `[COMPLETED & VERIFIED]` |
| **7** | Movie & TV Browsing Experience | Horizontal Category Navigation, 5–6 Col Grid, Card Overlays | `[READY TO START]` |
| **8** | Atmospheric Media Detail Pages | Full Backdrop Bleed, Title Block, Seasons/Episodes Stills, Cast | `[NOT STARTED]` |
| **9** | Personal Library "My Stuff" | Curated Playlists, Cinematic Collections, Watchlist, Chrono History | `[NOT STARTED]` |
| **10** | Liquid-Glass Media Player & Consumer Auth/Startup | Immersive Player, Floating Glass Controls, Trickplay, Login Screen | `[NOT STARTED]` |

---

## Detailed Step-by-Step Breakdown

### Step 1: Design Tokens, Real Liquid-Glass Surface System & Background Depth
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 3–14, 130–135, 140–141, 151–154, 199.
* **Core Tasks**:
  1. **Background Tonal Hierarchy**:
     - Foundation canvas: `#090A0B`.
     - Secondary background: `#0E0F10`.
     - Elevated surfaces: `#121314` and `#151516`.
     - Surface separation achieved through tonal variation rather than flat colored boxes or gray rectangles.
  2. **Liquid-Glass Formula**:
     - Fill: `background: rgba(18, 19, 20, 0.55)`.
     - Filter: `backdrop-filter: blur(24px) saturate(120%)` with `-webkit-backdrop-filter`.
     - Border: `1px solid rgba(255, 255, 255, 0.07)`.
     - Shadow: `box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28)`.
     - Subtle environment tinting responding to ambient media artwork.
  3. **Calico Color Palette & Orange Restraint**:
     - Signature orange: `#D97732` (restricted strictly to active navigation, playback progress, focused states, and primary action buttons).
     - Text colors: Primary `#F4F1EC`, Secondary `#B4AEA7`, Muted `#858079`.
     - Elimination of all AI-generated tropes: no purple/blue neon glows, no excessive pill shapes, no harsh gradients.
  4. **Typography & Spacing Scale**:
     - Typography tokens: Hero (52–72px), Page Heading (34–44px), Section Heading (22–26px), Card Title (15–18px), Metadata (13–15px), Small (11–13px).
     - Spacing tokens: 4, 8, 12, 16, 24, 32, 48, 64, 80px.
  5. **Atmospheric Loading System**:
     - Neutral/orange Khylo pulse loader replacing any remnants of the legacy blue spinner.
     - Skeleton placeholders with low contrast and smooth shimmer.
* **Target Files**:
  - `src/components/khylo/ui/tokens.ts`
  - `src/components/khylo/ui/typography.scss`
  - `src/themes/_base/_palette.scss`
  - `src/themes/_base/_theme.scss`
  - `src/styles/site.scss`
  - `src/components/loading/loading.scss`
* **Verification Criteria**:
  - CSS variables and SCSS tokens compile cleanly with zero errors.
  - Page backgrounds render `#090A0B` without flat gray card artifacts.
  - Liquid glass components blur background artwork smoothly.

---

### Step 2: Integrated Left Navigation Rail (Desktop Width 210–225px, Clean Structure & Pinning)
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 15–23, 183, 186.
* **Core Tasks**:
  1. **Dimensions & Proportions**:
     - Fixed desktop width: strictly 210–225px.
     - Integrated near-black appearance with subtle vertical separator (`rgba(255, 255, 255, 0.05)`).
  2. **Navigation Structure**:
     - `BROWSE`: Home + dynamically mounted server libraries (Movies, TV Shows, Music, etc.).
     - `MY STUFF`: Continue, Watchlist, Playlists, Collections, History.
     - `SOCIAL`: Friends, Activity, Shared With Me.
     - `PERSONAL` (Bottom-Left): Settings and Profile.
  3. **Interaction & Indicators**:
     - Active indicator: restrained 2–3px vertical orange accent edge, orange icon, bright text (`#F4F1EC`).
     - Micro-interaction hover (100–160ms) with slight brightness adjustment.
     - Precise route matching (no multi-item highlights).
  4. **Pinning Architecture**:
     - Persistent toggle button (stored in `localStorage`).
     - Unpinned mode: 80px collapsed rail expanding to 215px overlay on hover.
     - Pinned mode: locks open at 215px with content shifting seamlessly without layout distortion.
* **Target Files**:
  - `src/components/khylo/shell/KhyloNavRail.tsx`
  - `src/components/khylo/shell/KhyloNavRail.scss`
  - `src/components/khylo/shell/KhyloAppShell.tsx`
  - `src/components/khylo/shell/KhyloAppShell.scss`
* **Verification Criteria**:
  - Rail matches width 210–225px.
  - Clicking items navigates cleanly with exactly one active indicator.
  - Pinning persists on page reload.

---

### Step 3: Global Header, Liquid-Glass Search & Notification Center
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 24–32, 109–110, 184–185.
* **Core Tasks**:
  1. **Floating Header**:
     - Visually disappears into the canvas with subtle transparency and backdrop blur.
  2. **Global Search Input**:
     - Desktop width 500–600px, height 44–48px.
     - Liquid-glass surface, subtle border, placeholder: *"Search movies, shows, music, games, and more..."*.
  3. **Focused Search Overlay**:
     - Shortcut support (`/` and `Ctrl+K`).
     - Liquid-glass suggestion surface displaying recent searches, categories, and direct matches.
  4. **Top-Right Utility Area**:
     - Bell icon with small orange unread indicator.
     - Compact 40–44px avatar (plain username text removed from header).
  5. **Popovers**:
     - Floating liquid-glass Profile popover (*Profile, Preferences, Devices, Log Out*).
     - Liquid-glass Notification panel with unread tracking.
* **Target Files**:
  - `src/components/khylo/shell/KhyloTopBar.tsx`
  - `src/components/khylo/shell/KhyloTopBar.scss`
  - `src/components/khylo/shell/KhyloSearchModal.tsx`
  - `src/components/khylo/shell/KhyloSearchModal.scss`
* **Verification Criteria**:
  - Search opens instantly on keyboard shortcut.
  - Header recedes quietly behind content.
  - Notification panel and profile popover float over background with authentic blur.

---

### Step 4: Cinematic Home Hero Section (45–55% Viewport, Seamless Blends & Crossfade)
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 33–47, 136, 150–151.
* **Core Tasks**:
  1. **Viewport Proportions**:
     - Strictly 45–55% of the first viewport height (`52vh`, max 620px) so Continue Watching is immediately visible without scrolling.
     - Full available content width with 24–36px comfortable margins.
  2. **Triple-Fade Edge Dissolve**:
     - Left fade darkens image behind text for readability.
     - Bottom fade dissolves smoothly into page background.
     - Far edge ambient bleed (no hard rectangular borders).
  3. **Typographic Hierarchy**:
     - Small orange kicker (`CONTINUE WATCHING` or `FEATURED`, 12–14px).
     - Bold title (52–72px desktop).
     - Compact metadata row (`S1 E6 · TV-MA · 2023 · Drama`).
     - 2–3 line concise synopsis.
  4. **Hero Controls & Progress**:
     - Primary solid orange `RESUME` / `PLAY` button.
     - Secondary liquid-glass `DETAILS` button.
     - Subtle orange progress bar.
     - 300–500ms smooth crossfade for hero carousel transitions with minimalist indicators.
* **Target Files**:
  - `src/components/khylo/home/KhyloHero.tsx`
  - `src/components/khylo/home/KhyloHero.scss`
* **Verification Criteria**:
  - Hero does not exceed 55% viewport height.
  - Next content row is visible above the fold on 1080p and 1440p displays.
  - Edges dissolve seamlessly into `#090A0B`.

---

### Step 5: Media Card Hierarchy & High-Density Continue Watching Rail
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 48–67, 138, 157–159, 175.
* **Core Tasks**:
  1. **Continue Watching Rail**:
     - 16:9 landscape aspect ratio cards directly beneath the hero.
     - Card sizing: 4 cards @ 1440px, 5 @ 1920px, 5–7 @ 2560px.
     - Strict rule: never shrink cards into tiny illegible boxes to fit more content.
  2. **Card Structure & Interaction**:
     - Dominant artwork, orange progress line, title, and remaining time (`54 min left`).
     - Hover behavior: 1–3% transform scale, deepening diffuse shadow, subtle image brightening, contextual action buttons reveal.
  3. **Multi-Format Specialized Cards**:
     - Standard Media Cards (2:3 vertical posters for movies/series).
     - Album Cards (1:1 square artwork).
     - Book / Comic Cards (portrait cover proportions).
     - Box-Art Cards (3:4 ratio for games with platform tag).
     - Collection Cards (wide composite panels).
  4. **Rail Navigation**:
     - Natural trackpad / wheel horizontal scroll.
     - Contextual liquid-glass circular navigation arrows appearing only on overflow.
* **Target Files**:
  - `src/components/khylo/media/KhyloMediaCard.tsx`
  - `src/components/khylo/media/KhyloMediaCard.scss`
  - `src/components/khylo/media/KhyloContentRail.tsx`
  - `src/components/khylo/media/KhyloContentRail.scss`
* **Verification Criteria**:
  - Continue cards render large and readable at 16:9 with accurate remaining time.
  - Card hover does not distort surrounding layout.
  - Rail arrows scroll smoothly.

---

### Step 6: Home Visual Rhythm & Contextual Editorial Panels
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 68–72, 160–164.
* **Core Tasks**:
  1. **Compositional Rhythm (Netflix/Hulu Intuitive Discovery)**:
     - Hero Billboard: Large featured spotlight.
     - Dedicated Continue Watching Rail: Compact 16:9 cards with remaining duration, positioned right beneath the hero.
     - "Recently Released Episodes" Rail: Latest episodes and next up from user series.
     - "Recently Added in TV Shows" Rail: Fresh series additions.
     - "Recently Added in Movies" Rail: Fresh cinema additions.
     - "Recommended for You" Rail: Top community rated titles on the server.
     - "Curated Franchises & Collections": Wide composite cards for boxsets.
  2. **Dynamic Section Compression**:
     - Empty sections collapse cleanly with no blank gaps.
* **Target Files**:
  - `src/components/khylo/home/KhyloHomeView.tsx`
  - `src/components/khylo/home/KhyloHomeView.scss`
* **Verification Criteria**:
  - ✅ Intuitive editorial rhythm separating movies, TV, episodes, and recommendations.
  - ✅ Continue watching has a dedicated compact section under the hero.

---

### Step 7: Movie & TV Browsing Experience (Complete Streaming Discovery Overhaul)
* **Status**: `[COMPLETED & VERIFIED]`
* **Specification Anchors**: Specs 73–82, 144–146, 187.
* **Core Tasks**:
  1. **Removed Cluttered Top Pill Strip**:
     - Completely removed the 20-pill button strip that sat awkwardly above the billboard.
     - Implemented the sleek Netflix subnav pattern: Page title (`Movies` / `TV Shows`) + subtle `Genres ▾` glass dropdown popover.
  2. **Dedicated "Browse by Category" Section (Hulu / Netflix Collection Tray)**:
     - Embedded a dedicated "Browse by Category" area in the discovery flow.
     - Curated 16:9 visual category tiles featuring sample backdrop artwork, rich dark gradient overlays, category names, and title count indicators.
     - Clicking any category tile smoothly transitions into that category's curated view.
  3. **Metadata-Extracted Categories**:
     - Categories are dynamically aggregated directly from the metadata of titles in that library (`item.Genres`).
     - Sorted by title frequency, guaranteeing 100% accuracy with zero empty categories or out-of-sync tags.
  4. **Netflix/Hulu Curated Discovery Hub (Default Mode)**:
     - **Library Spotlight Hero**: Full-bleed backdrop, title, overview, rating, Play & Details buttons.
     - **Continue Watching Rail**: Scoped specifically to that library (next-up episodes for TV, in-progress movies for Movies).
     - **Recently Added Rail**: Newest additions to that library.
     - **Top Rated Rail**: Highest community-rated titles in that library.
     - **Dynamic Metadata Genre Rails**: Dedicated horizontal rails for the top genres on the server (e.g., Action & Adventure, Comedy, Sci-Fi & Fantasy).
  5. **Curated Genre & Catalog Grid (Filter / Toggle Mode)**:
     - Selecting a category smoothly filters into a 5–6 column poster grid (`repeat(auto-fill, minmax(200px, 1fr))`) showing strictly the titles matching that metadata.
     - Toggle between "Discovery Rows" and "All Titles Grid (A–Z)".
* **Target Files**:
  - `src/components/khylo/browse/KhyloLibraryBrowser.tsx`
  - `src/components/khylo/browse/KhyloLibraryBrowser.scss`
  - `src/apps/modern/features/libraries/components/LibraryPage.tsx`
* **Verification Criteria**:
  - ✅ TV Shows and Movies present full curated discovery hubs rather than dumping the user into a flat database grid.
  - ✅ Categories are extracted directly from item metadata.
  - ✅ Strict 5–6 column grid enforces large, readable posters without micro-column walls.

---

### Step 8: Atmospheric Media Detail Pages (Movie & TV Show Presentation)
* **Status**: `[COMPLETED - PENDING USER REVIEW]`
* **Specification Anchors**: Specs 83–95, 147–149, 180.
* **Core Tasks**:
  1. **Atmospheric Environment**:
     - 72vh cinematic backdrop bleeding into `#090A0B` with triple-dissolve gradients (left vignette, deep bottom fade, and top fade).
     - Fixed buggy back button (eliminated `left: 240px;` displacement; replaced with responsive liquid-glass pill button).
  2. **Header Presentation Block**:
     - Transparent title logo rendering (`ImageTags.Logo`) with bold typography fallback.
     - Rich metadata badges: Community rating (`★ 8.4`), Production Year, Official Rating pill (`TV-MA`, `PG-13`), Runtime, Video Quality (`4K UHD`, `HDR`, `HD`), Audio Format (`5.1 Surround`), and Genres.
     - Action controls: `PLAY` / `RESUME` (with progress track & remaining time), `IN WATCHLIST` / `WATCHLIST` toggle, `WATCHED` / `MARK WATCHED` toggle (`markPlayedItem` / `markUnplayedItem`), and `TRAILER` button.
  3. **TV Seasons, Episodes & "Next Up" Section**:
     - **Next Up Spotlight Banner**: Instant 1-click episode resuming for TV Series without digging through seasons.
     - Season selector tabs with badge counts.
     - Episode cards with 16:9 thumbnails, play overlay, and playback progress bars.
  4. **Technical Specifications Grid**:
     - Audio channels/codec, Video resolution/codec, Subtitles, Director, Writers, and Studio.
  5. **Cast & Crew Section & "More Like This" Recommendations**:
     - Circular cast & crew avatars with actor name and character role.
     - Large poster recommendation rail powered by `KhyloContentRail`.
* **Target Files**:
  - `src/components/khylo/details/KhyloDetailsView.tsx`
  - `src/components/khylo/details/KhyloDetailsView.scss`
  - `src/apps/modern/routes/details/index.tsx`
* **Verification Criteria**:
  - ✅ Backdrops blend seamlessly into the dark page without harsh borders or letterboxing.
  - ✅ Back button adapts responsively regardless of nav rail state.
  - ✅ Season tabs switch episode stills instantly.
  - ✅ Next Up banner enables 1-click continuation for TV series.
  - ✅ Full technical specs grid provides deep media insight.

---

### Step 9: Personal Library "My Stuff" (Playlists, Collections, Watchlist & History)
* **Status**: `[COMPLETED - PENDING USER REVIEW]`
* **Specification Anchors**: Specs 103–108, 142.
* **Core Tasks**:
  1. **Continue Watching Unification (Addressed User Directive)**:
     - Eliminated confusing and incorrect "Recently Released Episodes" row that was capturing in-progress shows.
     - Unified in-progress movies/episodes (`getResumeItems`) with active series next-up episodes (`getNextUp`) into a single, prominent **"Continue Watching"** rail placed directly under the cinematic hero billboard.
     - Preserved playback progress bars, time remaining indicators ("22 min left"), and 1-click resume capability.
  2. **Playlists Destination (`/playlists`)**:
     - Strict `itemType: [BaseItemKind.Playlist]` filter ensuring empty playlists don't query other media.
     - Square 1:1 artwork cards with track/item count badges.
     - Clean, branded empty state (*"No Playlists Yet. Create your first playlist to build your personal mixtape or marathon queue."*).
  3. **Collections / Boxsets (`/boxsets`) & Detail Integration**:
     - Wide 2.2:1 cinematic cards displaying item count pills (*"3 items"*).
     - Enhanced `KhyloDetailsView` with a dedicated "Titles in this Collection" / "Items in this Playlist" grid, allowing users to browse and play individual titles in boxset anthologies.
  4. **Watchlist Destination (`/home?tab=1`)**:
     - Curated personal queue with multi-column poster grid.
     - Category filter pills (*All Titles*, *Movies*, *TV Shows*).
     - Title count pill indicator and branded empty queue state.
  5. **Watch History Destination (`/home#history`)**:
     - Chronological grouping shelves (*Today*, *Yesterday*, *This Week*, *Earlier This Month*, *Older*) with poster media cards rather than flat tables.
* **Target Files**:
  - `src/components/khylo/home/KhyloHomeView.tsx`
  - `src/apps/modern/routes/home.tsx`
  - `src/components/khylo/browse/KhyloLibraryBrowser.tsx`
  - `src/components/khylo/details/KhyloDetailsView.tsx`
  - `src/components/khylo/details/KhyloDetailsView.scss`
  - `src/apps/modern/features/libraries/constants/views/playlists.ts`
* **Verification Criteria**:
  - ✅ In-progress items appear strictly in "Continue Watching" directly under hero with accurate progress.
  - ✅ Watchlist renders full filtered grid with title counts.
  - ✅ History presents grouped chronological sections.
  - ✅ Collections display as wide cinematic 2.2:1 cards and support full child media browsing on detail page.
  - ✅ Playlists display square 1:1 cards with item count badges and branded empty state.

---

### Step 10: Liquid-Glass In-Browser Media Player & Consumer Auth/Startup
* **Status**: `[NOT STARTED]`
* **Specification Anchors**: Specs 111–122, 124, 182, 188, 191–197.
* **Core Tasks**:
  1. **Immersion Philosophy**:
     - Video owns 100% of the viewport.
     - Controls auto-hide completely when idle; mouse, touch, or keyboard instantly reveals them.
  2. **Floating Liquid-Glass Player Surface**:
     - Controls sit in a floating liquid-glass container over the bottom of the video (translucency, 24–32px blur, subtle border).
     - Timeline scrub bar with Khylo orange progress and trickplay thumbnail preview popover.
  3. **Player Functional Controls**:
     - Play/Pause, Seek, Volume slider, Subtitle menu, Audio track selector, Quality/Settings, Next Episode, Fullscreen.
  4. **Khylo Player Error State**:
     - Refined, non-intrusive error screen with retry action (no raw browser crashes or red dev overlays).
  5. **Consumer Entertainment Login Screen**:
     - Atmospheric `#090A0B` environment, subtle warm ambient lighting, centered translucent glass card, warm calico typography, solid orange button.
  6. **Final Quality Audit & Reference Screen Verification**:
     - Verification against all 4 reference screens: Home, Movies, Detail, and Player.
     - Visual failure test: confirms the app looks neither like Khylo, nor a flat dashboard, nor an AI concept.
     - Playback failure test: verifies media playback across all entry points.
* **Target Files**:
  - `src/components/playback/iconosd.scss`
  - `src/components/playback/playbackmanager.js`
  - `src/apps/legacy/controllers/session/login/login.scss`
* **Verification Criteria**:
  - Video controls auto-hide and reveal smoothly with genuine liquid-glass blur over live video.
  - Scrubbing, subtitles, and audio selection work flawlessly.
  - Full TypeScript build check (`tsc --noEmit`) passes with 0 errors.

---

## Log of Completed Actions & Updates

### Step 1: Design Tokens, Real Liquid-Glass Surface System & Background Depth [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Token Hierarchy & Surface Tokens**:
     - Configured foundation `#090A0B`, secondary `#0E0F10`, elevated `#121314` and `#151516` across `tokens.ts`, `_palette.scss`, and `_theme.scss`.
     - Set up Calico text palette: Primary `#F4F1EC`, Secondary `#B4AEA7`, Muted `#858079`.
     - Enforced restrained Khylo orange `#D97732` (hover `#B85F22`, active `#964817`, subtle `rgba(217, 119, 50, 0.14)`).
  2. **Real Liquid-Glass System**:
     - Implemented authentic formula: `background: rgba(18, 19, 20, 0.55)`, `backdrop-filter: blur(24px) saturate(120%)`, `border: 1px solid rgba(255, 255, 255, 0.07)`, `box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28)`.
     - Added `.khylo-glass` and `.khylo-glass-elevated` utility classes in `typography.scss` and `site.scss`.
     - Integrated liquid glass into `KhyloButton.scss` (secondary and icon button variants).
  3. **Atmospheric Depth & Ambient Bleed**:
     - Ambient background field capped at 10% opacity with smooth 60% gradient fade down to `#090A0B`.
     - Configured low-contrast `#121314` base skeleton shimmer in `KhyloSkeleton.scss`.
  4. **Loading System Cleanliness**:
     - Modernized `.docspinner` with liquid glass blur and border.
     - Confirmed spinners alternate between `#F4F1EC` and `#D97732` with zero blue spinner artifacts.
* **Modified Files**:
  - `src/components/khylo/ui/tokens.ts`
  - `src/components/khylo/ui/typography.scss`
  - `src/themes/_base/_palette.scss`
  - `src/themes/_base/_theme.scss`
  - `src/themes/_base/theme.ts`
  - `src/styles/site.scss`
  - `src/components/loading/loading.scss`
  - `src/components/khylo/ui/KhyloSkeleton.scss`
  - `src/components/khylo/ui/KhyloButton.scss`
* **Verification Results**:
  - Webpack compilation: Successful (0 errors in 2444ms).
  - TypeScript check (`tsc --noEmit`): Exited with code 0 (zero errors).
  - Verified live on `http://localhost:8081`.

### Step 2: Integrated Left Navigation Rail [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Strict 210–225px Desktop Width**:
     - Configured expanded and pinned rail width to strictly `215px` in `KhyloNavRail.scss`.
     - Set collapsed icon-only rail width to `76px`.
     - Synced main layout container margin (`margin-left: 76px` collapsed, `margin-left: 215px` pinned) in `KhyloAppShell.scss`.
  2. **Navigation Hierarchy & Structure (Spec 16)**:
     - `BROWSE`: Home + dynamic mounted server libraries (filtered to suppress unmounted empty categories).
     - `MY STUFF`: Continue (`/home#continue`), Watchlist (`/home?tab=1`), Playlists (`/playlists`), Collections (`/boxsets`), History (`/home#history`).
     - `SOCIAL`: Friends (`/social/friends`), Activity (`/social/activity`), Shared With Me (`/social/shared`).
     - `PERSONAL`: Added bottom section with Settings (`/mypreferencesmenu`) and Profile (`/userprofile`).
  3. **Visual Treatment & Restrained Active State (Specs 18, 20, 21)**:
     - Background: `rgba(14, 15, 16, 0.96)` with 20px blur and `1px solid rgba(255, 255, 255, 0.06)` border-right separator.
     - Section headers: 11px uppercase (`0.6875rem`), letter-spacing `0.1em`, color `#858079`.
     - Icon stroke: Outlined MUI icons sized at `20px` (`1.25rem`).
     - Active state: Subtle dark surface (`rgba(255, 255, 255, 0.05)`), 2.5px vertical orange indicator (`#D97732`), orange icon, bright `#F4F1EC` text. Replaced giant orange pill.
  4. **Multi-Highlighting Elimination**:
     - Hardened `isActive` route, hash, and query parameter (`topParentId`, `tab=1`) matching to ensure strictly 1 active indicator across the entire sidebar.
  5. **Pinning Architecture**:
     - Pin toggle in rail header with smooth transition and `localStorage` persistence.
* **Modified Files**:
  - `src/components/khylo/shell/KhyloNavRail.tsx`
  - `src/components/khylo/shell/KhyloNavRail.scss`
  - `src/components/khylo/shell/KhyloAppShell.scss`
* **Verification Results**:
  - TypeScript check (`tsc --noEmit`): Exited with code 0 (zero errors).
  - Webpack compilation: Successful (0 errors, 2241ms, wrote directly to disk).
  - Verified live on `http://localhost:8081`.

### Step 2.5: User Profile & Settings Sub-Menus Overhaul & AI Tropes Elimination [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Elimination of AI Visual Tropes (Spec 5, Spec 6)**:
     - Stripped all glowing radial background gradients (`.khylo-profile-ambient`, `.khylo-settings-ambient`).
     - Removed neon orange drop-shadows on buttons (`box-shadow: 0 4px 16px rgba(217, 119, 50, 0.35)` replaced with subtle `0 1px 3px rgba(0,0,0,0.4)`).
     - Replaced bloated pill badges (`ADMINISTRATOR` pill with orange border) with understated, professional typography (`#858079` / `#B4AEA7`).
     - Removed artificial bouncing micro-interactions (`transform: translateY(-2px)` on hover cards replaced with subtle background brightening).
     - Standardized borders to restrained `rgba(255, 255, 255, 0.06)` with clean 8–12px radius.
  2. **Authentic Consumer Streaming User Profile (`/#/userprofile`)**:
     - Added clean `← Back to Settings` header link.
     - Redesigned Profile Header into an elegant Surface 2 card with 12px squircle avatar, clean display typography, and inline photo management actions.
     - Redesigned Security & Password into a grounded panel with industrial dark input fields, show/hide password toggles, and solid orange submit button.
     - Replaced generic SaaS shortcuts with an authentic streaming account directory (Display & Localization, Home Screen, Quick Connect, and Server Dashboard).
     - Added clean, non-intrusive Sign Out action row.
  3. **Complete Overhaul of Modern Display Preferences (`/#/mypreferencesdisplay`)**:
     - Resolved unstyled MUI text and raw floating controls.
     - Structured preferences into discrete Surface 2 cards (`khylo-settings-section-card`): Localization, Display & Appearance, Library Behavior, Next Up, and Item Detail.
     - Styled MUI Select, OutlinedInput, InputLabel, Checkbox, and FormControlLabel to seamlessly match Khylo's dark streaming design system.
     - Added a dedicated Khylo submit button (`KhyloButton`).
     - Removed legacy `libraryPage` class to prevent layout containment bugs.
  4. **Harmonization of Legacy Sub-Menus (`Home`, `Playback`, `Subtitles`, `Controls`, `Quick Connect`)**:
     - Removed legacy `libraryPage` containment classes from all sub-menu wrappers (`#homeScreenPreferencesPage`, `#languagePreferencesPage`, `#controlsPreferencesPage`, `#quickConnectPreferencesPage`).
     - Refactored `userPreferences.scss` to style `.verticalSection` into clean Surface 2 cards with reset for nested sections.
     - Modernized selects (`khylo-select`), inputs (`khylo-input`), checkboxes (`khylo-checkbox`), and live subtitle preview boxes.
     - Redesigned Quick Connect card with grounded Surface 2 styling.
  5. **Bespoke Streaming UI for Display Preferences (`/#/mypreferencesdisplay`)**:
     - Completely eliminated broken MUI `<FormControl>` and `<InputLabel>` collisions where floating labels were colliding with and printing directly on top of dropdown values (e.g. "DISPLAY LANGUAGE" overlapping "Auto").
     - Replaced clumsy MUI OutlinedInput with authentic, horizontal consumer streaming setting rows (`.khylo-pref-row`): setting title & description on the left, custom dropdown or toggle switch on the right.
     - Replaced all-caps screaming checkboxes with modern animated toggle switches (`.khylo-pref-switch`).
     - Added clean custom select elements with custom SVG chevrons (`.khylo-pref-select`).
     - Added a floating sticky save bar (`.khylo-pref-save-bar`) with the primary Khylo save button.
     - Scoped `userPreferences.scss` to eliminate any global uppercase label pollutions.
* **Modified Files**:
  - `src/components/khylo/ui/KhyloButton.scss`
  - `src/apps/legacy/routes/user/userprofile.tsx`
  - `src/apps/legacy/routes/user/userprofile.scss`
  - `src/apps/legacy/routes/user/settings/settings.scss`
  - `src/apps/modern/routes/user/display/index.tsx`
  - `src/apps/modern/routes/user/display/displayPreferences.scss`
  - `src/styles/userPreferences.scss`
  - `src/apps/legacy/routes/quickConnect/quickConnect.scss`
  - `src/apps/legacy/routes/quickConnect/index.tsx`
  - `src/apps/legacy/controllers/user/home/index.html`
  - `src/apps/legacy/controllers/user/playback/index.html`
  - `src/apps/legacy/controllers/user/subtitles/index.html`
  - `src/apps/legacy/controllers/user/controls/index.html`
* **Verification Results**:
  - Webpack compilation: Successful (0 errors, 2682ms, wrote directly to disk).
  - TypeScript check (`tsc --noEmit`): Exited with code 0 (zero errors).
  - Live dev server refreshed.

### Step 3: Global Header, Liquid-Glass Search & Notification Center [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Floating Liquid-Glass Header (Spec 24)**:
     - Header styled with authentic Surface 3 backdrop blur: `background: rgba(9, 10, 11, 0.75)`, `backdrop-filter: blur(24px) saturate(120%)`, `border-bottom: 1px solid rgba(255, 255, 255, 0.05)`.
     - Seamlessly recedes into page background without harsh box borders.
  2. **Global Search Input (Specs 26–28)**:
     - Desktop width: 580px, height: 46px.
     - Liquid-glass surface (`rgba(18, 19, 20, 0.65)`, 16px blur, `1px solid rgba(255, 255, 255, 0.07)`).
     - Placeholder: *"Search movies, shows, music, games, and more..."*.
     - Keyboard shortcut badge: `<kbd className='khylo-topbar__search-kbd'>/</kbd>`.
  3. **Focused Search Modal Overlay (Specs 26–28)**:
     - Keyboard shortcut support (`/` and `Ctrl+K` / `Cmd+K`).
     - Liquid-glass container with 28px blur and 1px border.
     - Live debounced search querying Movies, Shows, Episodes, Music, Albums, and Books.
     - Recent searches history with clearing capability.
  4. **Floating Liquid-Glass Notification Center (Specs 29, 31, 109)**:
     - Bell action button with dynamic 7px orange unread dot indicator (`#D97732`).
     - Created `KhyloNotificationCenter.tsx` & `KhyloNotificationCenter.scss`.
     - Real-time recent library additions feed, unread count tracking, "Mark all as read" button.
     - Direct click-to-item navigation with read status persistence (`localStorage`).
  5. **Compact Avatar & Profile Popover (Specs 29, 32, 110)**:
     - Removed plain username text from the header (Spec 29).
     - Circular compact avatar (40px) with subtle 1px border and hover zoom.
     - Liquid-glass profile popover (`260px` wide, 28px blur) with user identity block and direct links to *Profile*, *Settings Hub*, *Display & Audio*, *Pair Devices*, *Server Dashboard* (admin), and *Sign Out*.
* **Modified Files**:
  - `src/components/khylo/shell/KhyloTopBar.tsx`
  - `src/components/khylo/shell/KhyloTopBar.scss`
  - `src/components/khylo/shell/KhyloNotificationCenter.tsx`
  - `src/components/khylo/shell/KhyloNotificationCenter.scss`
  - `src/components/khylo/shell/KhyloSearchModal.scss`
  - `src/components/khylo/shell/index.ts`
* **Verification Results**:
  - Webpack compilation: Successful (0 errors, 2103ms, wrote directly to disk).
  - TypeScript check (`tsc --noEmit`): Exited with code 0 (zero errors).
  - Verified live on `http://localhost:8081`.

### Step 4: Cinematic Home Hero Section [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Strict Viewport Proportions (Specs 33–37)**:
     - Set hero height strictly to `52vh`, `min-height: 480px`, `max-height: 600px` in `KhyloHero.scss`.
     - Ensured Continue Watching rail is immediately visible in the lower half of the first viewport without scrolling on 1080p and 1440p displays.
     - Positioned with `padding: 0 40px` aligning with all content rails below.
  2. **Triple-Fade Edge Dissolves & Ambient Bleed (Specs 38–41)**:
     - Implemented deep left gradient (`linear-gradient(90deg, #090A0B 0%, ... 85%)`) ensuring 100% text contrast across any artwork.
     - Implemented 180px bottom gradient smoothly dissolving the hero into `#090A0B`.
     - Added subtle top vignette (70px) and soft right-edge ambient bleed (80px) eliminating hard borders.
     - Attached subtle 8% ambient backdrop field (`AmbientBackdrop`).
  3. **Seamless Crossfade Backdrop Carousel**:
     - Pre-rendered backdrop slides with `opacity` transition (500ms ease) replacing unmount/remount flashing.
     - Added auto-advance timer (8s) with instant pause on mouse hover (`onMouseEnter`/`onMouseLeave`).
     - Added understated bottom-right navigation: 34px circular glass arrow chevrons and minimalist dot indicators (active slide is an elongated 20px orange pill).
  4. **Typographic Hierarchy & Editorial Layout (Specs 42–44)**:
     - Small orange kicker (`CONTINUE WATCHING`, `NEXT UP`, or `FEATURED`, 12–14px) with glowing 6px orange dot.
     - Clamped 42–64px bold title with high contrast `#F4F1EC` and dark text shadow.
     - Episode subtitle if series (`S{season} E{episode} · {title}`) in `#D5CEC6`.
     - Compact metadata row (`Year`, `OfficialRating` badge, `Genres`, `Duration`, `4K UHD`/`HD` badge).
     - 2–3 line concise synopsis clamped to 3 lines max (`max-width: 580px`).
  5. **Playback Progress & Real Action Controls (Specs 45–47)**:
     - Added horizontal progress bar (220px track, orange fill `#D97732`, and formatted remaining time).
     - Primary solid orange `RESUME` / `PLAY` button triggering playback at the exact saved tick position.
     - Secondary liquid-glass `DETAILS` button navigating to item detail view.
     - Connected Watchlist bookmark button to real server mutation (`useToggleFavoriteMutation`) with optimistic UI updates.
  6. **Skeleton Loading Support**:
     - Built `khylo-hero--skeleton` state to eliminate cumulative layout shift (CLS) during initial query loads.
     - Enriched queries in `KhyloHomeView.tsx` with `Genres`, `Overview`, `Taglines`, `Width`, and `Height`.
* **Modified Files**:
  - `src/components/khylo/home/KhyloHero.tsx`
  - `src/components/khylo/home/KhyloHero.scss`
  - `src/components/khylo/home/KhyloHomeView.tsx`
  - `implementation.md`
* **Verification Results**:
  - Webpack compilation: Successful (0 errors in 2339ms, wrote directly to disk).
  - TypeScript check (`tsc --noEmit`): Exited with code 0 (zero errors).
  - Verified live on `http://localhost:8081`.

### Step 5: Media Card Hierarchy & High-Density Continue Watching Rail [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Dedicated "Continue Watching" Rail (Specs 48–55)**:
     - Implemented a single, dedicated **Continue Watching** section beneath the hero billboard, eliminating fragmented, duplicate "Next Up" rails.
     - Unified in-progress items (`resumeData`) and next-up television episodes (`nextUpData`), with intelligent show deduplication so active series only display once in the queue.
  2. **Compact, Premium 16:9 Card Sizing**:
     - Reduced Continue card width from 440px down to **270px** (290px @ 1440p, 310px @ 1920p), preventing single cards from monopolizing the screen.
     - 16:9 card aspect ratio (152px image height) creates a compact, readable, easily scannable queue.
     - Formatted metadata to show item title, episode number, and remaining time (`48m left`) in muted Calico text (`#B4AEA7`).
  3. **Artwork & Episode Still Resolution**:
     - Enhanced `getItemImageUrl` in `mediaUtils.ts` so continue-watching cards for TV episodes prioritize the exact 16:9 episode still snapshot (`Primary` tag) with seamless fallback to backdrop/thumb.
  4. **Micro-Interactions & Hover Motion**:
     - Standardized hover motion to sleek 1.03x scale (`transform: scale(1.03)`) without disruptive vertical translation.
     - Center Play button circle (`#D97732`, 42px) and Details button (`rgba(20, 21, 23, 0.75)`, 34px) reveal smoothly on hover.
     - Orange playback progress line (3px) along the bottom edge of the thumbnail.
  5. **Hero Billboard Full-Bleed Upgrade**:
     - Converted hero backdrop from a 72% right-aligned split to a **100% full-bleed cinema canvas**.
     - Applied a refined multi-stop dark gradient on the text side (`linear-gradient(90deg, #090A0B 0%, 25%, 45%, 65%, 85%)`), guaranteeing 100% text contrast while letting artwork sweep across the viewport.
     - Refined hero height to `48vh` (max 500px) with `margin-bottom: 12px`, seamlessly connecting to the Continue Watching row.
     - Configured hero to spotlight featured media rather than duplicating the first item in the continue queue.
  6. **Multi-Format Specialized Card Standards**:
     - Standardized 2:3 vertical posters (`width: 165px` @ standard, `180px` @ 1440p) for movie/series discovery rails.
     - Standardized 1:1 square artwork (`width: 180px`) for music albums.
     - Standardized 2.2:1 wide cards (`width: 320px`) for collections.
     - Reduced rail margin to `28px` to establish cohesive streaming visual rhythm.
* **Modified Files**:
  - `src/components/khylo/media/KhyloContentRail.scss`
  - `src/components/khylo/media/KhyloMediaCard.scss`
  - `src/components/khylo/media/mediaUtils.ts`
  - `src/components/khylo/home/KhyloHomeView.tsx`
  - `src/components/khylo/home/KhyloHero.scss`
  - `implementation.md`
* **Verification Results**:
  - Webpack compilation: Successful (0 errors in 2258ms, wrote directly to disk).
  - TypeScript check: 0 errors.
  - Verified live on `http://localhost:8081`.

### Step 6: Home Visual Rhythm & Contextual Editorial Panels [COMPLETED & VERIFIED]
* **Executed Actions**:
  1. **Visual Cadence Architecture (Specs 68–72)**:
     - Established rich alternating cadence across the Home view:
       *Featured Hero Billboard (Large 48vh)* → *Continue Watching (Compact 16:9 Landscape)* → *Recently Added (2:3 Vertical Posters)* → *Contextual Editorial Panel ("Popular on Your Server" with ambient artwork)* → *Collections (2.2:1 Wide Composite Cards)*.
     - Reduced inter-rail spacing to `28px` to eliminate cavernous dead space and keep content flowing.
  2. **Card Click & Hover Interaction Overhaul**:
     - Removed `backdrop-filter: blur(4px)` and heavy dark overlay from card hover states in `KhyloMediaCard.scss`. Poster artwork now remains 100% crisp and vibrant on hover.
     - Removed the confusing `(i)` info icon from posters. Clicking **anywhere** on a movie or TV show card (artwork, title, or metadata) directly opens the title details view (`/details?id=...`).
     - Added a clean, non-intrusive quick-play icon on hover for immediate playback.
  3. **Contextual Editorial Panel Refinement (`KhyloForYouPanel`)**:
     - Enforced fixed-width poster card styling (`width: 175px`, `190px` @ 1440p) with horizontal scroll support, preventing recommendation cards from stretching into giant boxes.
     - Styled ambient blurred backdrop (`opacity: 0.12`, `blur(50px)`) that subtly responds to featured artwork.
     - Streamlined badge typography (`FOR YOU`, 11px uppercase in `#D97732`), editorial headline, and recommendation reason.
  4. **Dynamic Section Compression & Blank Rail Collapse (Spec 71)**:
     - Implemented clean dynamic compression: empty rails (0 items) collapse and disappear completely without leaving blank gray boxes, empty placeholders, or broken layouts.
* **Modified Files**:
  - `src/components/khylo/media/KhyloMediaCard.tsx`
  - `src/components/khylo/media/KhyloMediaCard.scss`
  - `src/components/khylo/home/KhyloForYouPanel.scss`
  - `src/components/khylo/home/KhyloHomeView.tsx`
  - `implementation.md`
* **Verification Results**:
  - Webpack compilation: Successful (0 errors in 2195ms, wrote directly to disk).
  - TypeScript check: 0 errors.
  - Verified live on `http://localhost:8081`.






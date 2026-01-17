# Garden Plotter Design System

## Design Direction: "Greenhouse Journal"

A warm, organic aesthetic that feels like a well-loved gardening notebook rather than a sterile software tool. The interface should evoke the feeling of planning in a sunlit greenhouse with a cup of tea.

---

## Core Principles

### 1. Canvas-First
The 3D garden view is the hero. Everything else supports it. The garden should feel immersive and alive, not boxed in by competing UI elements.

### 2. Warm & Organic
Replace cold grays with warm creams, soft greens, and earthy tones. The UI should feel grown, not manufactured.

### 3. Generous Breathing Room
Spacious padding, clear separation between elements. Information should be easy to scan, not cramped.

### 4. Clear Hierarchy
Important things look important. Headers are distinct from body text. Actions are obvious.

### 5. Contextual Panels
Show information when it's relevant, hide it when it's not. Panels slide in and out gracefully.

---

## Color Palette

```css
:root {
  /* Backgrounds */
  --bg-canvas: #1a2e1a;           /* Deep forest - 3D view background */
  --bg-primary: #faf8f5;          /* Warm cream - main panel bg */
  --bg-secondary: #f3f0eb;        /* Soft parchment - cards, inputs */
  --bg-tertiary: #ebe7e0;         /* Aged paper - hover states */
  --bg-elevated: #ffffff;         /* Pure white - floating elements */

  /* Text */
  --text-primary: #2d3a2d;        /* Dark forest - headings */
  --text-secondary: #4a5a4a;      /* Muted green - body text */
  --text-tertiary: #6b7a6b;       /* Soft sage - captions, hints */
  --text-inverted: #faf8f5;       /* Cream - on dark backgrounds */

  /* Accents */
  --accent-primary: #4a7c59;      /* Garden green - primary actions */
  --accent-secondary: #c17f59;    /* Terracotta - highlights, links */
  --accent-tertiary: #8b7355;     /* Warm brown - borders, dividers */
  --accent-warning: #c9a227;      /* Goldenrod - warnings, tips */
  --accent-success: #5a8f5a;      /* Leaf green - success states */

  /* Bed Type Colors */
  --bed-vegetable: #4a7c59;       /* Garden green */
  --bed-flower: #c17f8e;          /* Dusty rose */
  --bed-perennial: #7b6fa0;       /* Lavender */
  --bed-berry: #a05a5a;           /* Berry red */

  /* Shadows & Effects */
  --shadow-soft: 0 2px 8px rgba(45, 58, 45, 0.08);
  --shadow-medium: 0 4px 16px rgba(45, 58, 45, 0.12);
  --shadow-strong: 0 8px 32px rgba(45, 58, 45, 0.16);
}
```

---

## Typography

### Font Stack

```css
:root {
  /* Display - Warm serif for headings */
  --font-display: 'Fraunces', 'Georgia', serif;

  /* Body - Friendly, readable sans-serif */
  --font-body: 'Source Sans 3', 'Segoe UI', sans-serif;

  /* Mono - For data, codes */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}
```

### Type Scale

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Page Title | Display | 28px | 600 | 1.2 |
| Section Header | Display | 20px | 600 | 1.3 |
| Card Title | Display | 17px | 600 | 1.3 |
| Body | Body | 15px | 400 | 1.6 |
| Body Small | Body | 14px | 400 | 1.5 |
| Caption | Body | 12px | 500 | 1.4 |
| Label | Body | 11px | 600 | 1.3 |

### Usage

- **Fraunces**: All headings, bed names, section titles
- **Source Sans 3**: Body text, descriptions, UI labels
- **JetBrains Mono**: Dimensions, coordinates, JSON data

---

## Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps, icon padding |
| `--space-2` | 8px | Related items, button padding |
| `--space-3` | 12px | Card padding (tight) |
| `--space-4` | 16px | Standard padding, gaps |
| `--space-5` | 20px | Section padding |
| `--space-6` | 24px | Card padding (spacious) |
| `--space-8` | 32px | Section gaps |
| `--space-10` | 40px | Major section breaks |
| `--space-12` | 48px | Panel padding |

---

## Layout Architecture

### Current Problems
1. Three competing panels fight for attention
2. No room for AI agent interface
3. Research panel hidden by default (forgotten)
4. 3D view feels boxed in

### New Layout: Canvas with Slide-Out Panels

```
┌─────────────────────────────────────────────────────────────────┐
│  [≡]  Garden Name               Layout ▾   ☀️ 12:00   [?] [⚙]  │  ← Top Bar (48px)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                      3D GARDEN VIEW                             │  ← Canvas (flex)
│                    (Full width/height)                          │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  💬 Ask about your garden...                            [Send]  │  ← Agent Bar (56px)
└─────────────────────────────────────────────────────────────────┘
     ↑                                                       ↑
  [Beds]                                                [Research]
  Drawer                                                  Drawer
```

### Panel Behavior

| Panel | Trigger | Position | Width | Default |
|-------|---------|----------|-------|---------|
| Beds/Details | Click bed OR toggle | Left slide-out | 360px | Closed |
| Research | Toggle button | Right slide-out | 480px | Closed |
| Agent Chat | Always visible | Bottom bar + expandable | Full width, 56-400px | Collapsed |

### Interaction Flow

1. **Default View**: Full 3D garden with minimal top bar and collapsed agent input
2. **Click a bed**: Left panel slides in with bed details
3. **Click elsewhere**: Left panel slides out
4. **Need research**: Click Research button, right panel slides in
5. **Talk to agent**: Type in bottom bar, expands to show conversation
6. **Agent makes changes**: 3D view updates in real-time

---

## Component Specifications

### Top Bar

```
Height: 48px
Background: var(--bg-primary) with subtle bottom border
Shadow: var(--shadow-soft)

Contents (left to right):
- Menu icon (hamburger) - future settings/navigation
- Garden name (Display font, 17px)
- Spacer (flex)
- Layout dropdown (compact)
- Time slider (compact, icon + time display)
- Help button (?)
- Settings button (⚙)
```

### Agent Bar (Collapsed)

```
Height: 56px
Background: var(--bg-elevated)
Border-top: 1px solid var(--accent-tertiary)
Shadow: var(--shadow-medium) upward

Contents:
- Plant/sparkle icon (agent indicator)
- Input field: "Ask about your garden..."
- Send button

On focus: Expands to show conversation history (up to 400px)
```

### Agent Panel (Expanded)

```
Height: 400px max (resizable)
Background: var(--bg-elevated)

Sections:
- Header: "Garden Assistant" + collapse button
- Messages area (scrollable)
  - User messages: right-aligned, terracotta accent
  - Agent messages: left-aligned, cream bg
  - Actions: highlighted cards showing what changed
- Input area: same as collapsed but larger

Messages can include:
- Text responses
- "Changed X beds" summaries with undo
- Mini previews of affected beds
```

### Left Drawer (Bed Details)

```
Width: 360px
Background: var(--bg-primary)
Shadow: var(--shadow-strong)
Transform: translateX(-100%) → translateX(0)
Transition: 300ms ease-out

Sections:
1. Header (sticky)
   - Bed name (Display, 20px)
   - Type badge (colored pill)
   - Close button

2. Quick Stats (grid)
   - Dimensions: 4' × 8'
   - Area: 32 sq ft
   - Crops: 4 varieties

3. Description (if exists)
   - Markdown rendered
   - Soft card background

4. Crops List
   - Each crop is a clickable card
   - Links to plant research docs

5. Notes (if exists)
   - Warning-style card

No tabs - just scroll. Keep it simple.
```

### Right Drawer (Research)

```
Width: 480px
Background: var(--bg-primary)
Shadow: var(--shadow-strong)
Transform: translateX(100%) → translateX(0)
Transition: 300ms ease-out

Sections:
1. Header (sticky)
   - Document title
   - Back button
   - Jump to dropdown
   - Close button

2. Content
   - Markdown rendered with custom styling
   - See Typography section for heading styles
   - Tables with warm styling
   - Code blocks with subtle bg
```

### Bed List (Overview Mode)

When no bed is selected, left drawer shows garden overview:

```
Sections:
1. Garden Info Card
   - Name, dimensions, zone
   - Summary paragraph

2. Time Commitment Card
   - Peak/off season hours
   - Visual mini-chart

3. Beds Grid (2 columns)
   - Small cards for each bed
   - Color dot + name + crop count
   - Click to select

4. Quick Actions
   - "Suggest improvements" → triggers agent
   - "View full analysis" → expands
```

---

## Interactive States

### Buttons

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | transparent | var(--text-secondary) | 1px var(--accent-tertiary) |
| Hover | var(--bg-tertiary) | var(--text-primary) | 1px var(--accent-primary) |
| Active | var(--accent-primary) | var(--text-inverted) | none |
| Disabled | var(--bg-secondary) | var(--text-tertiary) | 1px var(--bg-tertiary) |

### Cards

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
  padding: var(--space-5);
  box-shadow: var(--shadow-soft);
  transition: all 200ms ease;
}

.card:hover {
  border-color: var(--accent-tertiary);
  box-shadow: var(--shadow-medium);
  transform: translateY(-1px);
}

.card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-soft);
}
```

### Form Inputs

```css
.input {
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 6px;
  padding: var(--space-3) var(--space-4);
  font: var(--font-body);
  font-size: 15px;
  color: var(--text-primary);
  transition: all 150ms ease;
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(74, 124, 89, 0.15);
}
```

---

## Motion & Animation

### Principles
- **Purposeful**: Motion should communicate, not decorate
- **Quick**: 150-300ms for most transitions
- **Eased**: Use ease-out for entrances, ease-in for exits

### Transitions

| Element | Duration | Easing | Property |
|---------|----------|--------|----------|
| Drawer open/close | 300ms | ease-out | transform |
| Card hover | 200ms | ease | all |
| Button state | 150ms | ease | all |
| Agent expand | 400ms | ease-out | height |
| Fade in | 200ms | ease-out | opacity |

### Micro-interactions
- Bed selection: subtle pulse ring animation
- Save success: checkmark appears, fades
- Agent typing: three-dot bounce animation
- Drawer toggle: smooth slide with slight scale

---

## Responsive Behavior

### Breakpoints

| Name | Width | Layout Changes |
|------|-------|----------------|
| Desktop | > 1200px | Full layout, both drawers can open |
| Laptop | 900-1200px | Drawers overlay, slightly narrower |
| Tablet | 600-900px | Single drawer at a time, bottom sheet for agent |
| Mobile | < 600px | Full-screen panels, swipe navigation |

### Mobile Adaptations
- Top bar becomes minimal (hamburger + garden name)
- Drawers become full-screen overlays
- Agent bar fixed at bottom
- Swipe left = beds, swipe right = research
- 3D view has touch controls

---

## Implementation Notes

### CSS Architecture
- Use CSS custom properties for all design tokens
- Single `design-system.css` file with variables
- Component-scoped styles in each `.tsx` file
- No external CSS frameworks

### Font Loading
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet">
```

### Animation Library
- Use CSS transitions for simple state changes
- Consider Framer Motion for complex sequences (already available with React)

### Accessibility
- All interactive elements keyboard accessible
- Focus rings use var(--accent-primary)
- Color contrast meets WCAG AA
- Drawer close with Escape key
- Screen reader announcements for agent messages

---

## File Structure

```
src/
├── styles/
│   ├── design-system.css      # Tokens, variables, base styles
│   └── typography.css         # Font faces, type utilities
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   ├── Drawer.tsx         # Reusable slide-out drawer
│   │   ├── AgentBar.tsx
│   │   └── Canvas.tsx         # 3D view container
│   ├── panels/
│   │   ├── BedDetails.tsx
│   │   ├── GardenOverview.tsx
│   │   └── ResearchPanel.tsx
│   ├── agent/
│   │   ├── AgentInput.tsx
│   │   ├── AgentMessages.tsx
│   │   └── ActionCard.tsx     # Shows what agent changed
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       └── Dropdown.tsx
└── App.tsx                    # Main layout composition
```

---

## Migration Plan

### Phase 1: Foundation
1. Create design-system.css with all tokens
2. Add Google Fonts
3. Update index.css with base styles

### Phase 2: Layout Shell
1. New App.tsx with canvas-first layout
2. TopBar component
3. Drawer component (reusable)
4. Basic panel containers

### Phase 3: Panel Redesign
1. Migrate BedDetailsPanel to new styling
2. Migrate ResearchPanel to new styling
3. Add overview mode to beds panel

### Phase 4: Agent Integration
1. AgentBar component (collapsed state)
2. Agent conversation view (expanded)
3. Action cards for showing changes

### Phase 5: Polish
1. Animations and transitions
2. Responsive breakpoints
3. Accessibility audit
4. Performance optimization

---

## Future Considerations

### Themes
The variable-based system allows for easy theming:
- **Light (default)**: Warm cream backgrounds
- **Dark**: Deep forest greens
- **High Contrast**: For accessibility

### Customization
Users could eventually customize:
- Accent colors
- Font sizes
- Panel widths
- Animation preferences

### Offline Support
- Cache fonts locally
- Store layout data in IndexedDB
- Agent can work offline with local model (future)

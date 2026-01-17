# CLAUDE.md - Project Instructions

## Project Overview

This is a garden planning application for a **Back to Eden style raised bed garden** in **Exeter, Rhode Island (Zone 6b)**. The garden will feed two families (7 people: 4 adults, 3 toddlers) with fresh produce.

### Key Specs
- **Location:** Exeter, RI (USDA Zone 6b)
- **Size:** 40x40 ft (1,600 sq ft)
- **Method:** Back to Eden (wood chip mulch, hugelkultur base)
- **Beds:** 10-14 galvanized metal raised beds (17-18" tall)
- **Protection:** 8ft deer fence, hardware cloth for rodents, bird netting for berries
- **Budget:** $6,000-10,000 (hired labor)
- **Timeline:** Build Feb-Apr 2025, plant May 2025

---

## Repository Structure

```
garden/
├── CLAUDE.md              # THIS FILE - read first
├── src/
│   ├── components/
│   │   ├── ResearchPanel.tsx   # Markdown viewer with dynamic file loading
│   │   └── GardenView.tsx      # 3D visualization
│   ├── schemas/
│   │   ├── garden.ts           # Zod schemas for 3D rendering
│   │   └── layout.ts           # Zod schemas for layout planning data
│   └── scene/
│       └── GardenRenderer.ts   # THREE.js rendering
├── research/                   # Markdown research files (auto-discovered)
│   ├── plan.md                 # Master plan document
│   ├── layout.json             # Structured layout data
│   └── *.md                    # Topic-specific research
└── package.json
```

---

## Research Files

### How They Work
- All `.md` files in `research/` are **automatically discovered** via Vite's `import.meta.glob`
- They appear in the app's "Jump to" menu
- **Internal links** like `[file.md](file.md)` navigate within the app
- **External links** open in new tabs

### Adding New Research
1. Create `research/new-topic.md`
2. The file auto-appears in the jump list (title derived from filename)
3. Link to it from other docs: `[new-topic.md](new-topic.md)`

### Current Research Files
| File | Purpose |
|------|---------|
| `plan.md` | Master document - overview, decisions, next steps |
| `layout.json` | Structured data for the garden layout |
| `layout-design.md` | Visual layout, bed assignments, materials |
| `climate-zone.md` | Zone 6b info, frost dates, planting windows |
| `crop-recommendations.md` | What to grow, organized by effort level |
| `budget-summary.md` | Full cost breakdown with hired labor |
| `weekly-schedule.md` | Time commitment at 3 effort levels |
| `deer-protection.md` | 8ft fence specs and costs |
| `bird-protection.md` | Netting for berries |
| `rodent-protection.md` | Hardware cloth specs |
| `soil-ph-composition.md` | **CRITICAL** - pH testing, mushroom compost risks |
| `bed-materials-comparison.md` | Why metal beats cedar (cost analysis) |

---

## CRITICAL REQUIREMENTS

### 1. Every Research File MUST Have Validated Sources

**All factual claims must include links to authoritative sources.**

Good sources:
- University extension services (URI, UMass, Cornell, etc.)
- USDA resources
- Established gardening publications (Old Farmer's Almanac, etc.)
- Manufacturer specifications

**Format sources at the bottom of each file:**
```markdown
## Sources
- [Source Title](https://full-url.com/path)
- [Another Source](https://example.com)
```

**CRITICAL: You MUST visit each link yourself to verify it loads before adding it to any research file.** Do not assume URLs exist based on patterns or previous knowledge. Use the WebFetch tool to confirm each link returns valid content. Broken links undermine the credibility of the entire research base.

**Why this matters:** The user needs to verify information independently. Gardening advice varies by region and source quality. Bad advice (wrong pH, wrong frost dates, wrong pest control) can waste an entire growing season.

### 2. Be Conservative with Estimates

- When in doubt, overestimate costs
- When in doubt, overestimate time
- When in doubt, underestimate yields
- Better to be pleasantly surprised than disappointed

### 3. Rhode Island Specific

Always consider:
- Zone 6b conditions (not Zone 7 or 8)
- ~150 day growing season
- Last frost: May 15, First frost: Oct 15
- Heavy clay soil (why we're using raised beds)
- Deer pressure is HIGH in Exeter

### 4. Back to Eden Method Considerations

- Reduced watering needs (document this accurately)
- Direct seeding challenges (need to pull back mulch)
- Takes 2-3 years for soil to fully develop
- Wood chip sourcing matters (avoid black walnut, etc.)

### 5. Budget Consciousness

The user has money but values efficiency. Don't recommend:
- Overpriced boutique solutions
- Features that don't provide clear ROI
- Premium materials where standard works fine

DO recommend:
- Best value options (metal beds vs cedar)
- DIY where it makes sense
- Bulk purchasing

---

## Schema Usage

### layout.ts (Planning Data)
Used for the structured `layout.json` file containing:
- Bed positions, dimensions, crop assignments
- Protection specs (fence, netting, hardware cloth)
- Budget breakdown
- Timeline

### garden.ts (3D Rendering)
Used by GardenView for THREE.js visualization:
- 3D positions (Vector3)
- Plant rendering
- Visual representation

These are separate concerns - layout.ts is for planning, garden.ts is for display.

---

## Common Tasks

### Update Research
1. Edit the relevant `.md` file in `research/`
2. Ensure sources are included
3. Update `plan.md` if it affects key decisions

### Add New Research Topic
1. Create `research/topic-name.md`
2. Add `## Sources` section with links
3. Link from `plan.md` in the document index table
4. Internal links auto-work

### Update Layout Data
1. Edit `research/layout.json`
2. Ensure it validates against `src/schemas/layout.ts`
3. The 3D view will reflect changes

### Update Budget
1. Edit `research/budget-summary.md`
2. Update totals in `research/plan.md` Quick Summary section

---

## Key Decisions Already Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bed material | Galvanized metal | 20-30yr lifespan, $1,500 vs $9,000+ for cedar |
| Bed height | 17-18" | Enough depth for hugelkultur + good ergonomics |
| Deer fence | 8ft poly mesh | Only reliable option, ~$1,200-1,500 |
| Rodent protection | 1/4" hardware cloth, bottom only | Metal sides block burrowing |
| Irrigation | Soaker hose or drip (optional) | BTE reduces water needs significantly |
| Labor | Hired contractors | User time-constrained |

---

## Open Questions / Future Research

- [ ] Which specific berry varieties? (blueberries need acidic soil)
- [ ] Companion planting chart
- [ ] Succession planting calendar
- [ ] Seed variety recommendations (zone-appropriate cultivars)
- [ ] Local contractor recommendations
- [ ] Bulk compost suppliers near Exeter (with pH data)

---

## Local Resources

### Soil Testing
**URI Cooperative Extension Soil Testing Lab**
- https://web.uri.edu/coopext/soil-testing/
- Cost: ~$15-20
- Turnaround: ~2 weeks
- **Test compost BEFORE buying in bulk**

### Extension Services
- URI Cooperative Extension: https://web.uri.edu/coopext/
- UMass Extension (nearby, good resources): https://ag.umass.edu/resources

---

## Style Notes

- Use tables for comparisons
- Use clear headers for scannability
- Bold key warnings/decisions
- Include cost estimates where relevant
- Link between documents liberally
- Keep "Plan" as the central hub document

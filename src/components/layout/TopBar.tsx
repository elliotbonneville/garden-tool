import { useGardenStore } from "../../store/gardenStore";
import { availableLayouts } from "../GardenView";

interface TopBarProps {
  onToggleLeftDrawer: () => void;
  onToggleRightDrawer: () => void;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
}

// Format time for display (e.g., "12:00 PM")
function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function TopBar({ onToggleLeftDrawer, onToggleRightDrawer, leftDrawerOpen, rightDrawerOpen }: TopBarProps) {
  const {
    layoutData,
    selectedLayout,
    setSelectedLayout,
    sunTime,
    setSunTime,
  } = useGardenStore();

  const gardenName = layoutData?.metadata.name || "Garden Plotter";

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "var(--topbar-height)",
        background: "var(--bg-primary)",
        borderBottom: "1px solid var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--space-4)",
        gap: "var(--space-4)",
        zIndex: 30,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Left: Beds toggle + Garden name */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0, flex: "0 1 auto" }}>
        <button
          onClick={onToggleLeftDrawer}
          aria-label="Toggle garden details"
          aria-pressed={leftDrawerOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            background: leftDrawerOpen ? "var(--accent-primary)" : "transparent",
            border: leftDrawerOpen ? "none" : "1px solid var(--bg-tertiary)",
            borderRadius: "var(--border-radius)",
            color: leftDrawerOpen ? "var(--text-inverted)" : "var(--text-secondary)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            if (!leftDrawerOpen) {
              e.currentTarget.style.background = "var(--bg-tertiary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!leftDrawerOpen) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-primary)",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {gardenName}
        </h1>
      </div>

      {/* Center spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexShrink: 0 }}>
        {/* Layout selector */}
        {availableLayouts.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <label
              htmlFor="layout-select"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-tertiary)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              Layout
            </label>
            <select
              id="layout-select"
              value={selectedLayout}
              onChange={(e) => setSelectedLayout(e.target.value)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                paddingRight: "var(--space-8)",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--bg-tertiary)",
                background: "var(--bg-secondary)",
                fontSize: "var(--text-sm)",
                fontFamily: "var(--font-body)",
                color: "var(--text-primary)",
                cursor: "pointer",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a5a4a' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              {availableLayouts.map((layout) => (
                <option key={layout.slug} value={layout.slug}>
                  {layout.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Time of day control */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {/* Sun icon */}
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              color: "var(--accent-warning)",
              opacity: sunTime < 18 ? 1 : 0.3,
              transition: "opacity var(--transition-base)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          </span>
          <input
            type="range"
            min="5"
            max="20"
            step="0.1"
            value={sunTime}
            onChange={(e) => setSunTime(parseFloat(e.target.value))}
            aria-label="Time of day"
            style={{
              width: 140,
              height: 4,
              cursor: "pointer",
              accentColor: "var(--accent-warning)",
            }}
          />
          {/* Moon icon */}
          <span
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              color: "var(--text-tertiary)",
              opacity: sunTime >= 18 ? 1 : 0.3,
              transition: "opacity var(--transition-base)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
              minWidth: 72,
            }}
          >
            {formatTime(sunTime)}
          </span>
        </div>

        {/* Research toggle */}
        <button
          onClick={onToggleRightDrawer}
          aria-label="Toggle research documents"
          aria-pressed={rightDrawerOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            background: rightDrawerOpen ? "var(--accent-primary)" : "transparent",
            border: rightDrawerOpen ? "none" : "1px solid var(--bg-tertiary)",
            borderRadius: "var(--border-radius)",
            color: rightDrawerOpen ? "var(--text-inverted)" : "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-medium)",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            if (!rightDrawerOpen) {
              e.currentTarget.style.background = "var(--bg-tertiary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!rightDrawerOpen) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Research
        </button>
      </div>
    </header>
  );
}

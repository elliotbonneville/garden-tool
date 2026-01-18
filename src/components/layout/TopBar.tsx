import { useState, useRef, useEffect } from "react";
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

// Convert day of year (1-365) to ISO date string (YYYY-MM-DD) for input
function dayOfYearToDate(dayOfYear: number, year: number = 2025): string {
  const date = new Date(year, 0, dayOfYear);
  return date.toISOString().split("T")[0] || "";
}

// Convert ISO date string to day of year (1-365)
function dateTooDayOfYear(dateStr: string): number {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Format date for display (e.g., "Jun 21")
function formatDate(dayOfYear: number): string {
  const date = new Date(2025, 0, dayOfYear);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TopBar({ onToggleLeftDrawer, onToggleRightDrawer, leftDrawerOpen, rightDrawerOpen }: TopBarProps) {
  const {
    layoutData,
    selectedLayout,
    setSelectedLayout,
    sunTime,
    setSunTime,
    dayOfYear,
    setDayOfYear,
    showGrid,
    setShowGrid,
  } = useGardenStore();

  const [gardenDropdownOpen, setGardenDropdownOpen] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const gardenDropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  const gardenName = layoutData?.metadata.name || "Garden Plotter";

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (gardenDropdownRef.current && !gardenDropdownRef.current.contains(event.target as Node)) {
        setGardenDropdownOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setSettingsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      style={{
        position: "relative",
        height: "var(--topbar-height)",
        flexShrink: 0,
        background: "var(--bg-primary)",
        borderBottom: "1px solid var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--space-4)",
        gap: "var(--space-4)",
        zIndex: 20,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Left: Beds toggle + Garden selector */}
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

        {/* Garden name as selector */}
        <div ref={gardenDropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => availableLayouts.length > 1 && setGardenDropdownOpen(!gardenDropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              background: "transparent",
              border: "none",
              padding: "var(--space-1) var(--space-2)",
              margin: "-var(--space-1) -var(--space-2)",
              borderRadius: "var(--border-radius)",
              cursor: availableLayouts.length > 1 ? "pointer" : "default",
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              if (availableLayouts.length > 1) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
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
            {availableLayouts.length > 1 && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: "var(--text-tertiary)",
                  transform: gardenDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform var(--transition-fast)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {/* Garden dropdown */}
          {gardenDropdownOpen && availableLayouts.length > 1 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-tertiary)",
                borderRadius: "var(--border-radius)",
                boxShadow: "var(--shadow-medium)",
                minWidth: 200,
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              {availableLayouts.map((layout) => (
                <button
                  key={layout.slug}
                  onClick={() => {
                    setSelectedLayout(layout.slug);
                    setGardenDropdownOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "var(--space-3) var(--space-4)",
                    background: selectedLayout === layout.slug ? "var(--bg-secondary)" : "transparent",
                    border: "none",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-sm)",
                    fontWeight: selectedLayout === layout.slug ? "var(--weight-medium)" : "var(--weight-normal)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedLayout !== layout.slug) {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedLayout !== layout.slug) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {layout.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexShrink: 0 }}>
        {/* Settings dropdown */}
        <div ref={settingsDropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
            aria-label="View settings"
            title="View settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              background: settingsDropdownOpen ? "var(--accent-primary)" : "transparent",
              border: settingsDropdownOpen ? "none" : "1px solid var(--bg-tertiary)",
              borderRadius: "var(--border-radius)",
              color: settingsDropdownOpen ? "var(--text-inverted)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              if (!settingsDropdownOpen) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!settingsDropdownOpen) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Settings dropdown panel */}
          {settingsDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                background: "var(--bg-primary)",
                border: "1px solid var(--bg-tertiary)",
                borderRadius: "var(--border-radius)",
                boxShadow: "var(--shadow-medium)",
                padding: "var(--space-4)",
                minWidth: 280,
                zIndex: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Date setting */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--text-tertiary)",
                    marginBottom: "var(--space-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <input
                    type="date"
                    value={dayOfYearToDate(dayOfYear)}
                    onChange={(e) => setDayOfYear(dateTooDayOfYear(e.target.value))}
                    aria-label="Date"
                    style={{
                      flex: 1,
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--border-radius)",
                      border: "1px solid var(--bg-tertiary)",
                      background: "var(--bg-secondary)",
                      fontSize: "var(--text-sm)",
                      fontFamily: "var(--font-body)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      minWidth: 60,
                    }}
                  >
                    {formatDate(dayOfYear)}
                  </span>
                </div>
              </div>

              {/* Time setting */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--text-tertiary)",
                    marginBottom: "var(--space-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Time of Day
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      color: "var(--accent-warning)",
                      opacity: sunTime < 18 ? 1 : 0.3,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
                      flex: 1,
                      height: 4,
                      cursor: "pointer",
                      accentColor: "var(--accent-warning)",
                    }}
                  />
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      color: "var(--text-tertiary)",
                      opacity: sunTime >= 18 ? 1 : 0.3,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 70,
                      textAlign: "right",
                    }}
                  >
                    {formatTime(sunTime)}
                  </span>
                </div>
              </div>

              {/* Grid toggle */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    color: "var(--text-tertiary)",
                    marginBottom: "var(--space-2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  View
                </label>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: showGrid ? "var(--accent-primary)" : "var(--bg-secondary)",
                    border: "1px solid var(--bg-tertiary)",
                    borderRadius: "var(--border-radius)",
                    color: showGrid ? "var(--text-inverted)" : "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                  Show measurement grid
                </button>
              </div>
            </div>
          )}
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

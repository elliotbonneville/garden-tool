import { useState, useRef, useEffect } from "react";
import { useGardenStore } from "../../store/gardenStore";
import { availableLayouts } from "../GardenView";
import { HelpModal } from "../HelpModal";

interface MobileTopBarProps {
  onOpenResearch?: () => void;
  onOpenDetails?: () => void;
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

export function MobileTopBar({ onOpenResearch, onOpenDetails }: MobileTopBarProps) {
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const gardenName = layoutData?.metadata.name || "Garden Plotter";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header
      className="safe-area-top"
      style={{
        position: "relative",
        height: "var(--topbar-height)",
        flexShrink: 0,
        background: "var(--bg-primary)",
        borderBottom: "1px solid var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-3)",
        zIndex: 20,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Garden name */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-primary)",
          margin: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
      >
        {gardenName}
      </h1>

      {/* Menu button */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            background: menuOpen ? "var(--accent-primary)" : "transparent",
            border: menuOpen ? "none" : "1px solid var(--bg-tertiary)",
            borderRadius: "var(--border-radius)",
            color: menuOpen ? "var(--text-inverted)" : "var(--text-secondary)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
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
              width: "min(320px, calc(100vw - 24px))",
              zIndex: 100,
            }}
          >
            {/* Garden selector (if multiple) */}
            {availableLayouts.length > 1 && (
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
                  Garden
                </label>
                <select
                  value={selectedLayout || ""}
                  onChange={(e) => {
                    setSelectedLayout(e.target.value);
                    setMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "var(--space-3)",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--bg-tertiary)",
                    background: "var(--bg-secondary)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-body)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
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
                    padding: "var(--space-3)",
                    borderRadius: "var(--border-radius)",
                    border: "1px solid var(--bg-tertiary)",
                    background: "var(--bg-secondary)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-body)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    minHeight: 44,
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
                Time of Day — {formatTime(sunTime)}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ color: "var(--accent-warning)", opacity: sunTime < 18 ? 1 : 0.3 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                  </svg>
                </span>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="0.5"
                  value={sunTime}
                  onChange={(e) => setSunTime(parseFloat(e.target.value))}
                  aria-label="Time of day"
                  style={{
                    flex: 1,
                    height: 24,
                    cursor: "pointer",
                    accentColor: "var(--accent-warning)",
                  }}
                />
                <span style={{ color: "var(--text-tertiary)", opacity: sunTime >= 18 ? 1 : 0.3 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
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
                  padding: "var(--space-3)",
                  minHeight: 44,
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

            {/* Divider */}
            <div style={{
              height: 1,
              background: "var(--bg-tertiary)",
              margin: "var(--space-4) 0"
            }} />

            {/* Quick actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {/* Details button */}
              {onOpenDetails && (
                <button
                  onClick={() => {
                    onOpenDetails();
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    width: "100%",
                    padding: "var(--space-3)",
                    minHeight: 44,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--bg-tertiary)",
                    borderRadius: "var(--border-radius)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  View Garden Details
                </button>
              )}

              {/* Research button */}
              {onOpenResearch && (
                <button
                  onClick={() => {
                    onOpenResearch();
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    width: "100%",
                    padding: "var(--space-3)",
                    minHeight: 44,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--bg-tertiary)",
                    borderRadius: "var(--border-radius)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Open Research Docs
                </button>
              )}

              {/* Help button */}
              <button
                onClick={() => {
                  setHelpOpen(true);
                  setMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "var(--space-3)",
                  minHeight: 44,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--bg-tertiary)",
                  borderRadius: "var(--border-radius)",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                View Controls Help
              </button>
            </div>

            {/* Version number */}
            <div
              style={{
                marginTop: "var(--space-4)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--bg-tertiary)",
                textAlign: "center",
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
              }}
            >
              Garden Plotter v0.0.1
            </div>
          </div>
        )}
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}

import type { NavMode } from "./types";
import { getBreadcrumbs } from "./useResearchDocs";
import { CloseButton } from "../ui/CloseButton";

interface ResearchHeaderProps {
  slug: string;
  navMode: NavMode;
  onToggleMode: () => void;
  onClose: () => void;
  onNavigate: (slug: string) => void;
}

export function ResearchHeader({
  slug,
  navMode,
  onToggleMode,
  onClose,
  onNavigate,
}: ResearchHeaderProps) {
  const breadcrumbs = getBreadcrumbs(slug);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4) var(--space-5)",
        borderBottom: "1px solid var(--bg-tertiary)",
        flexShrink: 0,
        background: "var(--bg-primary)",
      }}
    >
      {/* Breadcrumbs / Title */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          overflow: "hidden",
        }}
      >
        {breadcrumbs.map((crumb, idx) => (
          <span key={crumb.slug} style={{ display: "flex", alignItems: "center" }}>
            {idx > 0 && (
              <span
                style={{
                  margin: "0 var(--space-2)",
                  color: "var(--text-tertiary)",
                  fontSize: "var(--text-sm)",
                }}
              >
                /
              </span>
            )}
            {idx === breadcrumbs.length - 1 ? (
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--weight-semibold)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {crumb.title}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(crumb.slug)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                  transition: "color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent-secondary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                {crumb.title}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Mode toggle button */}
      <button
        onClick={onToggleMode}
        aria-label={navMode === "compact" ? "Expand to fullscreen" : "Collapse to drawer"}
        title={navMode === "compact" ? "Expand to fullscreen" : "Collapse to drawer"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          background: "transparent",
          border: "1px solid var(--bg-tertiary)",
          borderRadius: "var(--border-radius-sm)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "all var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-tertiary)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {navMode === "compact" ? (
          // Expand icon
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 5V1H5" />
            <path d="M13 9V13H9" />
            <path d="M1 1L5.5 5.5" />
            <path d="M13 13L8.5 8.5" />
          </svg>
        ) : (
          // Collapse icon
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 1V5H1" />
            <path d="M9 13V9H13" />
            <path d="M5 5L1 1" />
            <path d="M9 9L13 13" />
          </svg>
        )}
      </button>

      {/* Close button */}
      <CloseButton onClick={onClose} size="small" label="Close research panel" />
    </div>
  );
}

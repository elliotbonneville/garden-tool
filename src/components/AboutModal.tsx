import { useEffect, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";

const STORAGE_KEY = "garden-about-dismissed";

export function AboutModal() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if modal has been dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26, 46, 26, 0.85)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          background: "var(--bg-primary)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "var(--shadow-strong)",
          maxWidth: 480,
          width: "90%",
          padding: isMobile ? "var(--space-5)" : "var(--space-8)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--weight-semibold)",
              color: "var(--text-primary)",
              margin: 0,
              marginBottom: "var(--space-2)",
            }}
          >
            Welcome to Garden Plotter
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)",
                color: "var(--accent-primary)",
                background: "rgba(74, 124, 89, 0.12)",
                padding: "2px 8px",
                borderRadius: "var(--border-radius-sm)",
              }}
            >
              Read-only Preview
            </span>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            color: "var(--text-secondary)",
          }}
        >
          <p style={{ marginBottom: "var(--space-4)" }}>
            This is an interactive visualization of a garden plan designed entirely using{" "}
            <strong style={{ color: "var(--text-primary)" }}>Claude Code</strong>,
            Anthropic's agentic coding tool.
          </p>
          <p style={{ marginBottom: "var(--space-4)" }}>
            Explore the 3D garden view, click on beds to see planting details,
            and browse the research documents that informed the design.
          </p>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-tertiary)",
              fontStyle: "italic",
            }}
          >
            This is a read-only interface — all planning and code was generated
            through conversation with Claude.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "var(--space-6)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleDismiss}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--weight-medium)",
              color: "var(--text-inverted)",
              background: "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--border-radius)",
              padding: "var(--space-3) var(--space-5)",
              cursor: "pointer",
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent-primary)";
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

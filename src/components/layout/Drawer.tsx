import { useEffect, useRef, type ReactNode } from "react";

interface DrawerProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side: "left" | "right";
  width?: number;
  title?: string;
  /** When true, the drawer renders no header - children manage their own header */
  noHeader?: boolean;
}

export function Drawer({ children, isOpen, onClose, side, width = 380, title, noHeader }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent scroll on body when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const translateX = side === "left"
    ? (isOpen ? "0" : "-100%")
    : (isOpen ? "0" : "100%");

  return (
    <>
      {/* Backdrop - positioned below header to keep header accessible */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: "var(--topbar-height)",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(26, 46, 26, 0.3)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity var(--transition-slow)",
          zIndex: 100,
        }}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: "fixed",
          top: "var(--topbar-height)",
          bottom: 0,
          [side]: 0,
          width,
          maxWidth: "90vw",
          background: "var(--bg-primary)",
          boxShadow: isOpen ? "var(--shadow-drawer)" : "none",
          transform: `translateX(${translateX})`,
          transition: "transform var(--transition-drawer)",
          zIndex: 110,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Drawer Header */}
        {title && !noHeader && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-4) var(--space-5)",
              borderBottom: "1px solid var(--bg-tertiary)",
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "transparent",
                border: "1px solid var(--bg-tertiary)",
                borderRadius: "var(--border-radius-sm)",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        )}

        {/* Drawer Content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

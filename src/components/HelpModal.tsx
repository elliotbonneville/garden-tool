import { useIsMobile } from "../hooks/useIsMobile";
import { CloseButton } from "./ui/CloseButton";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const isMobile = useIsMobile();

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
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-primary)",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "var(--shadow-strong)",
          maxWidth: 400,
          width: "90%",
          padding: isMobile ? "var(--space-5)" : "var(--space-6)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <CloseButton onClick={onClose} size="small" />
        </div>

        {/* Header */}
        <div style={{ marginBottom: "var(--space-5)", paddingRight: "var(--space-6)" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--weight-semibold)",
              color: "var(--text-primary)",
              margin: 0,
              marginBottom: "var(--space-2)",
            }}
          >
            Controls
          </h2>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-tertiary)",
              margin: 0,
            }}
          >
            How to navigate the 3D garden view
          </p>
        </div>

        {/* Controls list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {isMobile ? (
            // Mobile controls
            <>
              <ControlItem
                icon={<RotateIcon />}
                label="Rotate view"
                description="Drag with one finger"
              />
              <ControlItem
                icon={<PanIcon />}
                label="Pan view"
                description="Drag with two fingers"
              />
              <ControlItem
                icon={<ZoomIcon />}
                label="Zoom in/out"
                description="Pinch with two fingers"
              />
              <ControlItem
                icon={<TapIcon />}
                label="Select bed"
                description="Tap on a bed"
              />
            </>
          ) : (
            // Desktop controls
            <>
              <ControlItem
                icon={<RotateIcon />}
                label="Rotate view"
                description="Click and drag"
              />
              <ControlItem
                icon={<PanIcon />}
                label="Pan view"
                description="Shift + drag"
              />
              <ControlItem
                icon={<ZoomIcon />}
                label="Zoom in/out"
                description="Scroll wheel"
              />
              <ControlItem
                icon={<TapIcon />}
                label="Select bed"
                description="Click on a bed"
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "var(--space-5)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--weight-medium)",
              color: "var(--text-inverted)",
              background: "var(--accent-primary)",
              border: "none",
              borderRadius: "var(--border-radius)",
              padding: "var(--space-3) var(--space-5)",
              minHeight: 44,
              cursor: "pointer",
              transition: "background var(--transition-fast)",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

interface ControlItemProps {
  icon: React.ReactNode;
  label: string;
  description: string;
}

function ControlItem({ icon, label, description }: ControlItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3)",
        background: "var(--bg-secondary)",
        borderRadius: "var(--border-radius)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          background: "var(--bg-tertiary)",
          borderRadius: "var(--border-radius-sm)",
          color: "var(--accent-primary)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-medium)",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}

// Icons
function RotateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function PanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9l-3 3 3 3" />
      <path d="M9 5l3-3 3 3" />
      <path d="M15 19l-3 3-3-3" />
      <path d="M19 9l3 3-3 3" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function TapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  );
}

interface CloseButtonProps {
  onClick: () => void;
  label?: string;
  size?: "small" | "medium";
}

export function CloseButton({ onClick, label = "Close", size = "medium" }: CloseButtonProps) {
  const dimensions = size === "small" ? 32 : 40;
  const iconSize = size === "small" ? 16 : 20;

  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: dimensions,
        height: dimensions,
        background: "transparent",
        border: "1px solid var(--bg-tertiary)",
        borderRadius: "var(--border-radius)",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-tertiary)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-tertiary)";
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

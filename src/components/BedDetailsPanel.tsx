import { Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGardenStore } from "../store/gardenStore";
import { availableLayouts } from "./GardenView";

// Format time for display (e.g., "12:00 PM")
function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
}

// Convert crop ID to URL slug
function cropToSlug(crop: string): string {
  const baseCrop = crop.split("_")[0];
  return baseCrop || crop;
}

// Format crop name for display
function formatCropName(crop: string): string {
  return crop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function BedDetailsPanel() {
  const {
    selectedBed: bed,
    setSelectedBed,
    gardenInfo,
    selectedLayout,
    setSelectedLayout,
    sunTime,
    setSunTime,
  } = useGardenStore();

  // Garden info header (always shown)
  const GardenHeader = () => (
    <div style={{
      padding: "16px 20px",
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
    }}>
      {/* Layout selector */}
      {availableLayouts.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>
            Layout
          </label>
          <select
            value={selectedLayout}
            onChange={(e) => setSelectedLayout(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: 13,
              fontFamily: "system-ui, sans-serif",
              background: "#fff",
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

      {/* Time of day slider */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}>
          <label style={{ fontSize: 11, color: "#6b7280" }}>
            Time of Day
          </label>
          <span style={{
            fontSize: 11,
            color: "#374151",
            fontVariantNumeric: "tabular-nums",
          }}>{formatTime(sunTime)}</span>
        </div>
        <input
          type="range"
          min="5"
          max="20"
          step="0.1"
          value={sunTime}
          onInput={(e) => setSunTime(parseFloat((e.target as HTMLInputElement).value))}
          onChange={() => {}}
          style={{
            width: "100%",
            cursor: "pointer",
            accentColor: "#f59e0b",
          }}
        />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 9,
          color: "#9ca3af",
          marginTop: 2,
        }}>
          <span>5 AM</span>
          <span>Noon</span>
          <span>8 PM</span>
        </div>
      </div>

      {/* Garden info */}
      {gardenInfo && (
        <>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111",
            marginBottom: 8,
          }}>
            {gardenInfo.name}
          </div>
          <div style={{
            display: "flex",
            gap: 16,
            fontSize: 12,
            color: "#6b7280",
          }}>
            <span>{gardenInfo.dimensions.width}' × {gardenInfo.dimensions.length}'</span>
            <span>{gardenInfo.bedCount} beds</span>
          </div>
        </>
      )}
    </div>
  );

  if (!bed) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
        background: "#f9fafb",
      }}>
        <GardenHeader />
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          color: "#666",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🌱</div>
            <div style={{ fontSize: 13 }}>Click a bed to see details</div>
          </div>
        </div>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    vegetable: "#22c55e",
    flower: "#ec4899",
    perennial: "#8b5cf6",
    berry: "#ef4444",
  };

  const typeLabels: Record<string, string> = {
    vegetable: "Vegetable Bed",
    flower: "Flower Bed",
    perennial: "Perennial Bed",
    berry: "Berry Patch",
  };

  return (
    <div style={{
      height: "100%",
      overflow: "auto",
      fontFamily: "system-ui, sans-serif",
      background: "#f9fafb",
    }}>
      {/* Garden Info Header */}
      <GardenHeader />

      {/* Bed Header */}
      <div style={{
        padding: "16px 20px",
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111" }}>
            {bed.name}
          </h2>
          <div style={{
            display: "inline-block",
            marginTop: 6,
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            background: typeColors[bed.type] || "#6b7280",
            color: "#fff",
          }}>
            {typeLabels[bed.type] || bed.type}
          </div>
        </div>
        <button
          onClick={() => setSelectedBed(null)}
          style={{
            background: "none",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: "#9ca3af",
            padding: 4,
            lineHeight: 1,
          }}
          title="Clear selection"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* Dimensions */}
        <Section title="Dimensions">
          <Grid>
            <InfoItem label="Width" value={`${bed.dimensions.width} ft`} />
            <InfoItem label="Length" value={`${bed.dimensions.length} ft`} />
            <InfoItem label="Height" value={`${bed.dimensions.height || 12} in`} />
            <InfoItem
              label="Area"
              value={`${bed.dimensions.width * bed.dimensions.length} sq ft`}
            />
          </Grid>
        </Section>

        {/* Description */}
        {bed.description && (
          <Section title="Description">
            <div style={{
              padding: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.6,
            }}
            className="bed-description-markdown"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: 20 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: "8px 0", paddingLeft: 20 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                      {children}
                    </a>
                  ),
                  code: ({ children }) => (
                    <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3, fontSize: 12 }}>
                      {children}
                    </code>
                  ),
                }}
              >
                {bed.description}
              </ReactMarkdown>
            </div>
          </Section>
        )}

        {/* Material */}
        <Section title="Construction">
          <InfoItem
            label="Material"
            value={bed.material.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          />
        </Section>

        {/* Crops */}
        <Section title={`Crops (${bed.crops.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bed.crops.map((crop, i) => (
              <Link
                key={i}
                to={`/research/plants/${cropToSlug(crop)}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  fontSize: 13,
                  textDecoration: "none",
                  color: "#111",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.background = "#eff6ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#fff";
                }}
              >
                <span>{formatCropName(crop)}</span>
                <span style={{ color: "#3b82f6", fontSize: 12 }}>→</span>
              </Link>
            ))}
          </div>
        </Section>

        {/* Notes */}
        {bed.notes && (
          <Section title="Notes">
            <div style={{
              padding: 12,
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 6,
              fontSize: 13,
              color: "#92400e",
              lineHeight: 1.5,
            }}>
              {bed.notes}
            </div>
          </Section>
        )}

        {/* ID for reference */}
        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid #e5e7eb",
          fontSize: 11,
          color: "#9ca3af",
        }}>
          ID: {bed.id}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        margin: "0 0 10px 0",
        fontSize: 12,
        fontWeight: 600,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
    }}>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "8px 12px",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{value}</div>
    </div>
  );
}

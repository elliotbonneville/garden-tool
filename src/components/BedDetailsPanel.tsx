import { Link, useNavigate } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGardenStore } from "../store/gardenStore";
import { availableLayouts } from "./GardenView";
import type { LayoutBed } from "../schemas/layout";

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

// Tab button component
function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 16px",
        background: active ? "#fff" : "transparent",
        border: "none",
        borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? "#111" : "#6b7280",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

export function BedDetailsPanel() {
  const navigate = useNavigate();
  const {
    selectedBed: bed,
    setSelectedBed,
    layoutData,
    selectedLayout,
    setSelectedLayout,
    sunTime,
    setSunTime,
    detailsTab,
    setDetailsTab,
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
      <div>
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
    </div>
  );

  // Tab bar
  const TabBar = () => (
    <div style={{
      display: "flex",
      background: "#f9fafb",
      borderBottom: "1px solid #e5e7eb",
    }}>
      <TabButton active={detailsTab === "overview"} onClick={() => setDetailsTab("overview")}>
        Overview
      </TabButton>
      <TabButton active={detailsTab === "details"} onClick={() => setDetailsTab("details")}>
        Details
      </TabButton>
      <TabButton active={detailsTab === "analysis"} onClick={() => setDetailsTab("analysis")}>
        Analysis
      </TabButton>
    </div>
  );

  // Overview tab content
  const OverviewContent = () => {
    if (!layoutData) {
      return (
        <div style={{ padding: 20, color: "#666", textAlign: "center" }}>
          No layout data available
        </div>
      );
    }

    const { metadata, site, summary, beds, timeline, climate } = layoutData;

    return (
      <div style={{ padding: 20 }}>
        {/* Garden name and basic info */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 600, color: "#111" }}>
            {metadata.name}
          </h2>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
            color: "#6b7280",
          }}>
            <span>{site.dimensions.width}' × {site.dimensions.length}'</span>
            <span>·</span>
            <span>{beds.length} beds</span>
            <span>·</span>
            <span>Zone {metadata.location.usda_zone}</span>
          </div>
        </div>

        {/* Summary overview (if available) */}
        {summary?.overview && (
          <Section title="About This Garden">
            <div style={{
              padding: 12,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.6,
            }}
            className="overview-markdown"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: 20 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: "8px 0", paddingLeft: 20 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                      {children}
                    </a>
                  ),
                }}
              >
                {summary.overview}
              </ReactMarkdown>
            </div>
          </Section>
        )}

        {/* Time commitment (if available) */}
        {summary?.time_commitment && (
          <Section title="Time Commitment">
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}>
              <InfoItem
                label="Peak Season"
                value={`${summary.time_commitment.peak_season_hours_per_week} hrs/week`}
              />
              <InfoItem
                label="Off Season"
                value={`${summary.time_commitment.off_season_hours_per_week} hrs/week`}
              />
              <InfoItem
                label="Spring Setup"
                value={`${summary.time_commitment.spring_setup_hours} hrs`}
              />
              <InfoItem
                label="Fall Cleanup"
                value={`${summary.time_commitment.fall_cleanup_hours} hrs`}
              />
            </div>
          </Section>
        )}

        {/* Beds list */}
        <Section title={`Beds (${beds.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {beds.map((bedItem) => (
              <BedListItem
                key={bedItem.id}
                bed={bedItem}
                onClick={() => {
                  setSelectedBed(bedItem);
                  setDetailsTab("details");
                }}
              />
            ))}
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}>
            <InfoItem label="Planting Date" value={formatDate(timeline.planting_date)} />
            <InfoItem label="First Harvest" value={formatDate(timeline.first_harvest)} />
            <InfoItem label="Last Frost" value={climate.last_frost} />
            <InfoItem label="First Frost" value={climate.first_frost} />
          </div>
        </Section>

        {/* Tips (if available) */}
        {summary?.tips && summary.tips.length > 0 && (
          <Section title="Tips">
            <div style={{
              padding: 12,
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 6,
              fontSize: 13,
              color: "#92400e",
            }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {summary.tips.map((tip, i) => (
                  <li key={i} style={{ marginBottom: 6, lineHeight: 1.5 }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <span>{children}</span>,
                        strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#92400e", textDecoration: "underline" }}>
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {tip}
                    </ReactMarkdown>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}
      </div>
    );
  };

  // Details tab content
  const DetailsContent = () => {
    if (!bed) {
      return (
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
      <div style={{ padding: 0 }}>
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
  };

  // Analysis tab content
  const AnalysisContent = () => {
    if (!layoutData) {
      return (
        <div style={{ padding: 24, color: "#6b7280", textAlign: "center" }}>
          <p>No layout data available.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Select a layout to see analysis.</p>
        </div>
      );
    }

    const { site, beds, budget, timeline, climate, summary, protection, growing_method } = layoutData;

    // Calculate derived stats
    const totalBedArea = beds.reduce((sum, b) => sum + b.dimensions.width * b.dimensions.length, 0);
    const totalCrops = beds.reduce((sum, b) => sum + b.crops.length, 0);
    const uniqueCrops = new Set(beds.flatMap(b => b.crops.map(c => c.split("_")[0]))).size;
    const bedsByType = beds.reduce((acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div style={{ padding: 20 }}>
        {/* Garden Overview */}
        <Section title="Garden Overview">
          <Grid>
            <StatCard label="Total Area" value={`${site.total_sqft} sq ft`} />
            <StatCard label="Growing Area" value={`${totalBedArea} sq ft`} />
            <StatCard label="Beds" value={`${beds.length}`} />
            <StatCard label="Growing Season" value={`${climate.growing_days} days`} />
          </Grid>
        </Section>

        {/* Crop Diversity */}
        <Section title="Crop Diversity">
          <Grid>
            <StatCard label="Total Plantings" value={`${totalCrops}`} />
            <StatCard label="Unique Crops" value={`${uniqueCrops}`} />
          </Grid>
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            <strong>Bed Types:</strong>{" "}
            {Object.entries(bedsByType).map(([type, count]) => (
              <span key={type} style={{ marginRight: 12 }}>
                {type}: {count}
              </span>
            ))}
          </div>
        </Section>

        {/* Plant Directory */}
        <Section title="Plant Directory">
          <PlantDirectory
            beds={beds}
            onPlantClick={(slug) => navigate(`/research/plants/${slug}`)}
          />
        </Section>

        {/* Time Commitment */}
        {summary?.time_commitment && (
          <Section title="Time Commitment">
            <Grid>
              <StatCard
                label="Peak Season"
                value={`${summary.time_commitment.peak_season_hours_per_week} hrs/wk`}
                subtext="June - August"
              />
              <StatCard
                label="Off Season"
                value={`${summary.time_commitment.off_season_hours_per_week} hrs/wk`}
                subtext="Sept - May"
              />
            </Grid>
            <div style={{
              marginTop: 12,
              padding: 10,
              background: "#dbeafe",
              border: "1px solid #93c5fd",
              borderRadius: 6,
              fontSize: 12,
              color: "#1d4ed8",
            }}>
              <strong>Annual:</strong> ~{Math.round(
                summary.time_commitment.peak_season_hours_per_week * 12 +
                summary.time_commitment.off_season_hours_per_week * 40 +
                summary.time_commitment.spring_setup_hours +
                summary.time_commitment.fall_cleanup_hours
              )} hours/year
            </div>
          </Section>
        )}

        {/* Budget */}
        <Section title="Budget">
          <Grid>
            <StatCard
              label="Materials"
              value={`$${budget.materials.beds + budget.materials.fence + budget.materials.hardware_cloth + budget.materials.soil_compost + budget.materials.irrigation + budget.materials.bird_netting}`}
            />
            <StatCard
              label="Labor"
              value={`$${budget.labor.total}`}
              subtext={`${budget.labor.estimated_hours} hrs`}
            />
          </Grid>
          <div style={{
            marginTop: 12,
            padding: 10,
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>Total</span>
            <span>${budget.total}</span>
          </div>
        </Section>

        {/* Protection */}
        <Section title="Protection">
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#374151" }}>
            <div><strong>Deer:</strong> {protection.deer.type === "none" ? "None" : `${protection.deer.height_ft}ft ${protection.deer.material}`}</div>
            <div><strong>Rodent:</strong> {protection.rodent.type === "none" ? "None" : `${protection.rodent.mesh_size_inches}" mesh`}</div>
            <div><strong>Bird:</strong> {protection.bird.type === "none" ? "None" : protection.bird.type.replace(/_/g, " ")}</div>
          </div>
        </Section>

        {/* Growing Method */}
        <Section title="Growing Method">
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#374151" }}>
            <div><strong>Method:</strong> {growing_method.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
            <div><strong>Mulch:</strong> {growing_method.mulch_type.replace(/_/g, " ")}</div>
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          <div style={{ fontSize: 12, lineHeight: 1.8, color: "#374151" }}>
            <div><strong>Build:</strong> {timeline.build_phase.start} - {timeline.build_phase.end}</div>
            <div><strong>Plant:</strong> {timeline.planting_date}</div>
            <div><strong>Harvest:</strong> {timeline.first_harvest}</div>
          </div>
        </Section>
      </div>
    );
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
      background: "#f9fafb",
    }}>
      <GardenHeader />
      <TabBar />
      <div style={{ flex: 1, overflow: "auto" }}>
        {detailsTab === "overview" && <OverviewContent />}
        {detailsTab === "details" && <DetailsContent />}
        {detailsTab === "analysis" && <AnalysisContent />}
      </div>
    </div>
  );
}

// Bed list item for overview
function BedListItem({ bed, onClick }: { bed: LayoutBed; onClick: () => void }) {
  const typeColors: Record<string, string> = {
    vegetable: "#22c55e",
    flower: "#ec4899",
    perennial: "#8b5cf6",
    berry: "#ef4444",
  };

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        fontSize: 13,
        textAlign: "left",
        cursor: "pointer",
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: typeColors[bed.type] || "#6b7280",
        }} />
        <span style={{ fontWeight: 500 }}>{bed.name}</span>
      </div>
      <span style={{ fontSize: 11, color: "#9ca3af" }}>
        {bed.crops.length} crop{bed.crops.length !== 1 ? "s" : ""}
      </span>
    </button>
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

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div style={{
      padding: "10px 12px",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
    }}>
      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>{value}</div>
      {subtext && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{subtext}</div>}
    </div>
  );
}

function PlantDirectory({ beds, onPlantClick }: {
  beds: Array<{ id: string; name: string; type: string; crops: string[] }>;
  onPlantClick: (slug: string) => void;
}) {
  const { setSelectedBed, setDetailsTab } = useGardenStore();

  // Build crop -> beds map
  const cropToBeds: Record<string, Array<{ id: string; name: string; type: string; crops: string[] }>> = {};
  for (const bed of beds) {
    for (const crop of bed.crops) {
      const baseCrop = crop.split("_")[0] || crop;
      if (!cropToBeds[baseCrop]) {
        cropToBeds[baseCrop] = [];
      }
      if (!cropToBeds[baseCrop].some(b => b.id === bed.id)) {
        cropToBeds[baseCrop].push(bed);
      }
    }
  }

  const sortedCrops = Object.keys(cropToBeds).sort((a, b) => a.localeCompare(b));

  const typeColors: Record<string, string> = {
    vegetable: "#22c55e",
    flower: "#ec4899",
    perennial: "#8b5cf6",
    berry: "#ef4444",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sortedCrops.map(crop => (
        <div
          key={crop}
          style={{
            padding: "8px 10px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <button
            onClick={() => onPlantClick(crop)}
            style={{
              fontWeight: 600,
              marginBottom: 4,
              color: "#2563eb",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 12,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          >
            {formatCropName(crop)}
          </button>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(cropToBeds[crop] || []).map(bed => (
              <button
                key={bed.id}
                onClick={() => {
                  const fullBed = beds.find(b => b.id === bed.id);
                  if (fullBed) {
                    setSelectedBed(fullBed as LayoutBed);
                    setDetailsTab("details");
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 6px",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 3,
                  fontSize: 10,
                  color: "#6b7280",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.color = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: typeColors[bed.type] || "#6b7280",
                }} />
                {bed.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

import { Link, useNavigate } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGardenStore } from "../store/gardenStore";
import type { LayoutBed } from "../schemas/layout";

// Format crop name for display
function formatCropName(crop: string): string {
  return crop.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// Convert crop ID to URL slug
function cropToSlug(crop: string): string {
  return crop.split("_")[0] || crop;
}

// Format date for display
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function BedDetailsPanel() {
  const navigate = useNavigate();
  const {
    selectedBed: bed,
    setSelectedBed,
    layoutData,
    detailsTab,
    setDetailsTab,
  } = useGardenStore();

  // No layout loaded
  if (!layoutData) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        color: "var(--text-tertiary)",
        textAlign: "center",
      }}>
        <div>
          <div style={{ fontSize: 40, marginBottom: "var(--space-4)", opacity: 0.4 }}>🌱</div>
          <p style={{ fontSize: "var(--text-base)" }}>No layout loaded</p>
        </div>
      </div>
    );
  }

  const { metadata, site, summary, beds, timeline, climate } = layoutData;

  // Tab bar
  const TabBar = () => (
    <div style={{
      display: "flex",
      borderBottom: "1px solid var(--bg-tertiary)",
      background: "var(--bg-secondary)",
    }}>
      {(["overview", "details", "analysis"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setDetailsTab(tab)}
          style={{
            flex: 1,
            padding: "var(--space-3) var(--space-4)",
            background: "transparent",
            border: "none",
            borderBottom: detailsTab === tab ? "2px solid var(--accent-primary)" : "2px solid transparent",
            fontSize: "var(--text-sm)",
            fontWeight: detailsTab === tab ? "var(--weight-semibold)" : "var(--weight-normal)",
            fontFamily: "var(--font-body)",
            color: detailsTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            textTransform: "capitalize",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  // Overview tab content
  const OverviewContent = () => (
    <div style={{ padding: "var(--space-5)" }}>
      {/* Garden header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-primary)",
          margin: 0,
          marginBottom: "var(--space-2)",
          lineHeight: "var(--leading-tight)",
        }}>
          {metadata.name}
        </h2>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          fontSize: "var(--text-sm)",
          color: "var(--text-tertiary)",
        }}>
          <span>{site.dimensions.width}' × {site.dimensions.length}'</span>
          <span style={{ color: "var(--accent-tertiary)" }}>·</span>
          <span>{beds.length} beds</span>
          <span style={{ color: "var(--accent-tertiary)" }}>·</span>
          <span>Zone {metadata.location.usda_zone}</span>
        </div>
      </div>

      {/* About section */}
      {summary?.overview && (
        <Section title="About This Garden">
          <Card>
            <MarkdownContent content={summary.overview} />
          </Card>
        </Section>
      )}

      {/* Time commitment */}
      {summary?.time_commitment && (
        <Section title="Time Commitment">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <StatCard label="Peak Season" value={`${summary.time_commitment.peak_season_hours_per_week} hrs/week`} />
            <StatCard label="Off Season" value={`${summary.time_commitment.off_season_hours_per_week} hrs/week`} />
            <StatCard label="Spring Setup" value={`${summary.time_commitment.spring_setup_hours} hrs`} />
            <StatCard label="Fall Cleanup" value={`${summary.time_commitment.fall_cleanup_hours} hrs`} />
          </div>
        </Section>
      )}

      {/* Beds list */}
      <Section title={`Beds (${beds.length})`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          <StatCard label="Planting Date" value={formatDate(timeline.planting_date)} />
          <StatCard label="First Harvest" value={formatDate(timeline.first_harvest)} />
          <StatCard label="Last Frost" value={climate.last_frost} />
          <StatCard label="First Frost" value={climate.first_frost} />
        </div>
      </Section>

      {/* Tips */}
      {summary?.tips && summary.tips.length > 0 && (
        <Section title="Tips">
          <div style={{
            padding: "var(--space-4)",
            background: "var(--accent-warning-bg)",
            border: "1px solid var(--accent-warning)",
            borderRadius: "var(--border-radius)",
          }}>
            <ul style={{
              margin: 0,
              paddingLeft: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}>
              {summary.tips.map((tip, i) => (
                <li key={i} style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: "var(--leading-relaxed)",
                }}>
                  <MarkdownContent content={tip} inline />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );

  // Details tab content (selected bed)
  const DetailsContent = () => {
    if (!bed) {
      return (
        <div style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-6)",
          color: "var(--text-tertiary)",
          textAlign: "center",
        }}>
          <div>
            <div style={{ fontSize: 40, marginBottom: "var(--space-4)", opacity: 0.4 }}>🌱</div>
            <p style={{ fontSize: "var(--text-base)" }}>Click a bed to see details</p>
          </div>
        </div>
      );
    }

    const typeColors: Record<string, string> = {
      vegetable: "var(--bed-vegetable)",
      flower: "var(--bed-flower)",
      perennial: "var(--bed-perennial)",
      berry: "var(--bed-berry)",
    };

    const typeLabels: Record<string, string> = {
      vegetable: "Vegetable",
      flower: "Flower",
      perennial: "Perennial",
      berry: "Berry",
    };

    return (
      <div>
        {/* Bed header */}
        <div style={{
          padding: "var(--space-5)",
          borderBottom: "1px solid var(--bg-tertiary)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-3)",
        }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--weight-semibold)",
              color: "var(--text-primary)",
              margin: 0,
              marginBottom: "var(--space-2)",
            }}>
              {bed.name}
            </h2>
            <span style={{
              display: "inline-block",
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--border-radius-sm)",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)",
              background: typeColors[bed.type] || "var(--text-tertiary)",
              color: "var(--text-inverted)",
            }}>
              {typeLabels[bed.type] || bed.type}
            </span>
          </div>
          <button
            onClick={() => setSelectedBed(null)}
            aria-label="Clear selection"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              background: "transparent",
              border: "1px solid var(--bg-tertiary)",
              borderRadius: "var(--border-radius-sm)",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "var(--space-5)" }}>
          {/* Dimensions */}
          <Section title="Dimensions">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <StatCard label="Width" value={`${bed.dimensions.width} ft`} />
              <StatCard label="Length" value={`${bed.dimensions.length} ft`} />
              <StatCard label="Height" value={`${bed.dimensions.height || 12} in`} />
              <StatCard label="Area" value={`${bed.dimensions.width * bed.dimensions.length} sq ft`} />
            </div>
          </Section>

          {/* Description */}
          {bed.description && (
            <Section title="Description">
              <Card>
                <MarkdownContent content={bed.description} />
              </Card>
            </Section>
          )}

          {/* Crops */}
          <Section title={`Crops (${bed.crops.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {bed.crops.map((crop, i) => (
                <Link
                  key={i}
                  to={`/research/plants/${cropToSlug(crop)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--bg-tertiary)",
                    borderRadius: "var(--border-radius)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    transition: "all var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-primary)";
                    e.currentTarget.style.background = "var(--bg-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--bg-tertiary)";
                    e.currentTarget.style.background = "var(--bg-elevated)";
                  }}
                >
                  <span>{formatCropName(crop)}</span>
                  <span style={{ color: "var(--accent-secondary)", fontSize: "var(--text-sm)" }}>→</span>
                </Link>
              ))}
            </div>
          </Section>

          {/* Notes */}
          {bed.notes && (
            <Section title="Notes">
              <div style={{
                padding: "var(--space-4)",
                background: "var(--accent-warning-bg)",
                border: "1px solid var(--accent-warning)",
                borderRadius: "var(--border-radius)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                lineHeight: "var(--leading-relaxed)",
              }}>
                {bed.notes}
              </div>
            </Section>
          )}
        </div>
      </div>
    );
  };

  // Analysis tab content
  const AnalysisContent = () => {
    const { budget, protection, growing_method } = layoutData;

    const totalBedArea = beds.reduce((sum, b) => sum + b.dimensions.width * b.dimensions.length, 0);
    const totalCrops = beds.reduce((sum, b) => sum + b.crops.length, 0);
    const uniqueCrops = new Set(beds.flatMap(b => b.crops.map(c => c.split("_")[0]))).size;

    return (
      <div style={{ padding: "var(--space-5)" }}>
        {/* Garden overview stats */}
        <Section title="Garden Overview">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <StatCard label="Total Area" value={`${site.total_sqft} sq ft`} />
            <StatCard label="Growing Area" value={`${totalBedArea} sq ft`} />
            <StatCard label="Total Beds" value={`${beds.length}`} />
            <StatCard label="Growing Season" value={`${climate.growing_days} days`} />
          </div>
        </Section>

        {/* Crop diversity */}
        <Section title="Crop Diversity">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <StatCard label="Total Plantings" value={`${totalCrops}`} />
            <StatCard label="Unique Crops" value={`${uniqueCrops}`} />
          </div>
        </Section>

        {/* Budget */}
        <Section title="Budget">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <StatCard
              label="Materials"
              value={`$${budget.materials.beds + budget.materials.fence + budget.materials.hardware_cloth + budget.materials.soil_compost + budget.materials.irrigation + budget.materials.bird_netting}`}
            />
            <StatCard
              label="Labor"
              value={`$${budget.labor.total}`}
              subtext={`${budget.labor.estimated_hours} hrs`}
            />
          </div>
          <div style={{
            marginTop: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--bg-secondary)",
            borderRadius: "var(--border-radius)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-primary)",
          }}>
            <span>Total</span>
            <span>${budget.total}</span>
          </div>
        </Section>

        {/* Protection */}
        <Section title="Protection">
          <Card>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}>
              <div><strong style={{ color: "var(--text-primary)" }}>Deer:</strong> {protection.deer.type === "none" ? "None" : `${protection.deer.height_ft}ft ${protection.deer.material}`}</div>
              <div><strong style={{ color: "var(--text-primary)" }}>Rodent:</strong> {protection.rodent.type === "none" ? "None" : `${protection.rodent.mesh_size_inches}" mesh`}</div>
              <div><strong style={{ color: "var(--text-primary)" }}>Bird:</strong> {protection.bird.type === "none" ? "None" : protection.bird.type.replace(/_/g, " ")}</div>
            </div>
          </Card>
        </Section>

        {/* Growing method */}
        <Section title="Growing Method">
          <Card>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}>
              <div><strong style={{ color: "var(--text-primary)" }}>Method:</strong> {growing_method.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div><strong style={{ color: "var(--text-primary)" }}>Mulch:</strong> {growing_method.mulch_type.replace(/_/g, " ")}</div>
            </div>
          </Card>
        </Section>
      </div>
    );
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-body)",
      background: "var(--bg-primary)",
    }}>
      <TabBar />
      <div style={{ flex: 1, overflow: "auto" }}>
        {detailsTab === "overview" && <OverviewContent />}
        {detailsTab === "details" && <DetailsContent />}
        {detailsTab === "analysis" && <AnalysisContent />}
      </div>
    </div>
  );
}

// Helper components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--space-6)" }}>
      <h3 style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        margin: 0,
        marginBottom: "var(--space-3)",
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "var(--space-4)",
      background: "var(--bg-elevated)",
      border: "1px solid var(--bg-tertiary)",
      borderRadius: "var(--border-radius)",
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div style={{
      padding: "var(--space-3) var(--space-4)",
      background: "var(--bg-elevated)",
      border: "1px solid var(--bg-tertiary)",
      borderRadius: "var(--border-radius)",
    }}>
      <div style={{
        fontSize: "var(--text-xs)",
        color: "var(--text-tertiary)",
        marginBottom: "var(--space-1)",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: "var(--text-lg)",
        fontWeight: "var(--weight-semibold)",
        color: "var(--text-primary)",
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-tertiary)",
          marginTop: "var(--space-1)",
        }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

function BedListItem({ bed, onClick }: { bed: LayoutBed; onClick: () => void }) {
  const typeColors: Record<string, string> = {
    vegetable: "var(--bed-vegetable)",
    flower: "var(--bed-flower)",
    perennial: "var(--bed-perennial)",
    berry: "var(--bed-berry)",
  };

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--bg-tertiary)",
        borderRadius: "var(--border-radius)",
        fontSize: "var(--text-sm)",
        textAlign: "left",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        width: "100%",
        fontFamily: "var(--font-body)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-primary)";
        e.currentTarget.style.background = "var(--bg-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--bg-tertiary)";
        e.currentTarget.style.background = "var(--bg-elevated)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: typeColors[bed.type] || "var(--text-tertiary)",
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
          {bed.name}
        </span>
      </div>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>
        {bed.crops.length} crop{bed.crops.length !== 1 ? "s" : ""}
      </span>
    </button>
  );
}

function MarkdownContent({ content, inline }: { content: string; inline?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => inline
          ? <span>{children}</span>
          : <p style={{ margin: 0, marginBottom: "var(--space-3)", lineHeight: "var(--leading-relaxed)" }}>{children}</p>,
        h2: ({ children }) => (
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-primary)",
            margin: 0,
            marginTop: "var(--space-4)",
            marginBottom: "var(--space-2)",
          }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-primary)",
            margin: 0,
            marginTop: "var(--space-3)",
            marginBottom: "var(--space-2)",
          }}>{children}</h3>
        ),
        ul: ({ children }) => (
          <ul style={{ margin: 0, marginBottom: "var(--space-3)", paddingLeft: "var(--space-5)" }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: 0, marginBottom: "var(--space-3)", paddingLeft: "var(--space-5)" }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: "var(--space-1)", lineHeight: "var(--leading-relaxed)" }}>{children}</li>
        ),
        strong: ({ children }) => (
          <strong style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-secondary)", textDecoration: "none" }}
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

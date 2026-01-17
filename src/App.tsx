import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { GardenView, availableLayouts, type GardenInfo } from "./components/GardenView";
import { ResearchPanel } from "./components/ResearchPanel";
import { BedDetailsPanel } from "./components/BedDetailsPanel";
import type { LayoutBed } from "./schemas/layout";

export function App() {
  const [selectedBed, setSelectedBed] = useState<LayoutBed | null>(null);
  const [leftPaneVisible, setLeftPaneVisible] = useState(true);
  const [rightPaneVisible, setRightPaneVisible] = useState(true);
  const [selectedLayout, setSelectedLayout] = useState<string>(availableLayouts[0]?.slug || "");
  const [gardenInfo, setGardenInfo] = useState<GardenInfo | null>(null);

  const handleBedSelect = (bed: LayoutBed | null) => {
    setSelectedBed(bed);
    // Auto-show right pane when a bed is selected
    if (bed && !rightPaneVisible) {
      setRightPaneVisible(true);
    }
  };

  const handleLayoutChange = (slug: string) => {
    setSelectedLayout(slug);
    setSelectedBed(null); // Clear bed selection when layout changes
  };

  return (
    <BrowserRouter>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <Allotment>
          <Allotment.Pane
            minSize={leftPaneVisible ? 300 : 0}
            maxSize={leftPaneVisible ? 600 : 0}
            preferredSize={leftPaneVisible ? 450 : 0}
            visible={leftPaneVisible}
          >
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Header with collapse button */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Research</span>
                <button
                  onClick={() => setLeftPaneVisible(false)}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                  title="Hide research panel"
                >
                  ←
                </button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Routes>
                  <Route path="/" element={<ResearchPanel />} />
                  <Route path="/research/*" element={<ResearchPanel />} />
                </Routes>
              </div>
            </div>
          </Allotment.Pane>
          <Allotment.Pane minSize={400}>
            <GardenView
              onBedSelect={handleBedSelect}
              selectedBedId={selectedBed?.id}
              selectedLayout={selectedLayout}
              onLayoutChange={handleLayoutChange}
              onGardenInfoChange={setGardenInfo}
            />
          </Allotment.Pane>
          <Allotment.Pane
            minSize={rightPaneVisible ? 250 : 0}
            maxSize={rightPaneVisible ? 400 : 0}
            preferredSize={rightPaneVisible ? 300 : 0}
            visible={rightPaneVisible}
          >
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Header with collapse button */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Details</span>
                <button
                  onClick={() => setRightPaneVisible(false)}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                  title="Hide panel"
                >
                  →
                </button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <BedDetailsPanel
                  bed={selectedBed}
                  onClose={() => setSelectedBed(null)}
                  gardenInfo={gardenInfo}
                  layouts={availableLayouts}
                  selectedLayout={selectedLayout}
                  onLayoutChange={handleLayoutChange}
                />
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>

        {/* Show button when left pane is hidden */}
        {!leftPaneVisible && (
          <button
            onClick={() => setLeftPaneVisible(true)}
            style={{
              position: "fixed",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "0 4px 4px 0",
              padding: "12px 8px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 100,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: 12,
              color: "#374151",
              fontFamily: "system-ui, sans-serif",
            }}
            title="Show research panel"
          >
            Research →
          </button>
        )}

        {/* Show button when right pane is hidden */}
        {!rightPaneVisible && (
          <button
            onClick={() => setRightPaneVisible(true)}
            style={{
              position: "fixed",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "4px 0 0 4px",
              padding: "12px 8px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 100,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: 12,
              color: "#374151",
              fontFamily: "system-ui, sans-serif",
            }}
            title="Show bed details"
          >
            ← Bed Details
          </button>
        )}
      </div>
    </BrowserRouter>
  );
}

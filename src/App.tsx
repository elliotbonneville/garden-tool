import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { GardenView, availableLayouts } from "./components/GardenView";
import { ResearchPanel } from "./components/research";
import { BedDetailsPanel } from "./components/BedDetailsPanel";
import { TopBar } from "./components/layout/TopBar";
import { AgentBar } from "./components/layout/AgentBar";
import { MobileLayout } from "./components/layout/MobileLayout";
import { AboutModal } from "./components/AboutModal";
import { useGardenStore } from "./store/gardenStore";
import { useIsMobile } from "./hooks/useIsMobile";

export function App() {
  const {
    selectedLayout,
    setSelectedLayout,
    setSelectedBed,
    leftPaneVisible: leftDrawerOpen,
    rightPaneVisible: rightDrawerOpen,
    setLeftPaneVisible: setLeftDrawerOpen,
    setRightPaneVisible: setRightDrawerOpen,
    researchNavMode,
    leftDrawerWidth,
    rightDrawerWidth,
    setLeftDrawerWidth,
    setRightDrawerWidth,
    agentBarHeight,
    agentBarExpanded,
    agentBarFullscreen,
    setAgentBarHeight,
  } = useGardenStore();

  const isMobile = useIsMobile();

  // Initialize layout on mount
  useEffect(() => {
    if (!selectedLayout && availableLayouts[0]) {
      setSelectedLayout(availableLayouts[0].slug);
    }
  }, [selectedLayout, setSelectedLayout]);

  // Determine if research panel should be fullscreen (expanded mode and open)
  const isResearchFullscreen = researchNavMode === "expanded" && rightDrawerOpen;

  // Mobile layout
  if (isMobile) {
    return (
      <BrowserRouter>
        <AboutModal />
        <div
          style={{
            width: "100vw",
            height: "100dvh", // Dynamic viewport height for Safari
            overflow: "hidden",
            background: "var(--bg-canvas)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <MobileLayout />
        </div>
      </BrowserRouter>
    );
  }

  // Desktop layout
  return (
    <BrowserRouter>
      <AboutModal />
      <div
        style={{
          width: "100vw",
          height: "100dvh", // Dynamic viewport height for Safari
          overflow: "hidden",
          background: "var(--bg-canvas)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar */}
        <TopBar
          onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)}
          onToggleRightDrawer={() => setRightDrawerOpen(!rightDrawerOpen)}
          leftDrawerOpen={leftDrawerOpen}
          rightDrawerOpen={rightDrawerOpen}
        />

        {/* Main content area with resizable panels */}
        <div className="allotment-container" style={{ flex: 1, overflow: "hidden" }}>
          {agentBarFullscreen ? (
            // Fullscreen agent bar
            <AgentBar />
          ) : (
            <Allotment
              vertical
              proportionalLayout={false}
              onDragEnd={(sizes) => {
                // Save agent bar height when resized
                if (sizes[1] && sizes[1] > 50) {
                  setAgentBarHeight(sizes[1]);
                }
              }}
            >
              {/* Main content pane */}
              <Allotment.Pane minSize={200}>
                {isResearchFullscreen ? (
                  // Fullscreen research panel (expanded mode)
                  <Routes>
                    <Route path="/" element={<ResearchPanel mode="expanded" onClose={() => setRightDrawerOpen(false)} />} />
                    <Route path="/research/*" element={<ResearchPanel mode="expanded" onClose={() => setRightDrawerOpen(false)} />} />
                  </Routes>
                ) : (
                  <Allotment
                    proportionalLayout={false}
                    onDragEnd={(sizes) => {
                      // Update widths only for visible panels with valid sizes
                      if (leftDrawerOpen && sizes[0] && sizes[0] > 100) {
                        setLeftDrawerWidth(sizes[0]);
                      }
                      if (rightDrawerOpen && sizes[2] && sizes[2] > 100) {
                        setRightDrawerWidth(sizes[2]);
                      }
                    }}
                  >
                    {/* Left panel - Bed details */}
                    <Allotment.Pane
                      visible={leftDrawerOpen}
                      preferredSize={leftDrawerWidth}
                      minSize={280}
                      maxSize={600}
                      snap
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "var(--bg-primary)",
                          borderRight: "1px solid var(--bg-tertiary)",
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                        }}
                      >
                        {/* Panel Header */}
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
                            Garden Details
                          </h2>
                          <button
                            onClick={() => {
                              setLeftDrawerOpen(false);
                              setSelectedBed(null);
                            }}
                            aria-label="Close panel"
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
                        {/* Panel Content */}
                        <div style={{ flex: 1, overflow: "auto" }}>
                          <BedDetailsPanel />
                        </div>
                      </div>
                    </Allotment.Pane>

                    {/* Center - Garden View (main content) */}
                    <Allotment.Pane minSize={300}>
                      <GardenView />
                    </Allotment.Pane>

                    {/* Right panel - Research (compact mode) */}
                    <Allotment.Pane
                      visible={rightDrawerOpen}
                      preferredSize={rightDrawerWidth}
                      minSize={320}
                      maxSize={800}
                      snap
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "var(--bg-primary)",
                          borderLeft: "1px solid var(--bg-tertiary)",
                          overflow: "hidden",
                        }}
                      >
                        <Routes>
                          <Route path="/" element={<ResearchPanel onClose={() => setRightDrawerOpen(false)} />} />
                          <Route path="/research/*" element={<ResearchPanel onClose={() => setRightDrawerOpen(false)} />} />
                        </Routes>
                      </div>
                    </Allotment.Pane>
                  </Allotment>
                )}
              </Allotment.Pane>

              {/* Agent bar - bottom panel */}
              <Allotment.Pane
                visible={agentBarExpanded}
                preferredSize={agentBarHeight}
                minSize={72}
                maxSize={600}
                snap
              >
                <AgentBar />
              </Allotment.Pane>
            </Allotment>
          )}
        </div>

        {/* Collapsed agent bar - shown when not expanded and not fullscreen */}
        {!agentBarExpanded && !agentBarFullscreen && <AgentBar />}
      </div>
    </BrowserRouter>
  );
}

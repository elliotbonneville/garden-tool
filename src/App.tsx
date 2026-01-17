import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { GardenView, availableLayouts } from "./components/GardenView";
import { ResearchPanel } from "./components/ResearchPanel";
import { BedDetailsPanel } from "./components/BedDetailsPanel";
import { TopBar } from "./components/layout/TopBar";
import { Drawer } from "./components/layout/Drawer";
import { AgentBar } from "./components/layout/AgentBar";
import { useGardenStore } from "./store/gardenStore";

export function App() {
  const {
    selectedLayout,
    setSelectedLayout,
    setSelectedBed,
    leftPaneVisible: leftDrawerOpen,
    rightPaneVisible: rightDrawerOpen,
    setLeftPaneVisible: setLeftDrawerOpen,
    setRightPaneVisible: setRightDrawerOpen,
  } = useGardenStore();

  // Initialize layout on mount
  useEffect(() => {
    if (!selectedLayout && availableLayouts[0]) {
      setSelectedLayout(availableLayouts[0].slug);
    }
  }, [selectedLayout, setSelectedLayout]);

  return (
    <BrowserRouter>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          background: "var(--bg-canvas)",
        }}
      >
        {/* Top bar */}
        <TopBar
          onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)}
          onToggleRightDrawer={() => setRightDrawerOpen(!rightDrawerOpen)}
          leftDrawerOpen={leftDrawerOpen}
          rightDrawerOpen={rightDrawerOpen}
        />

        {/* Main canvas area */}
        <main
          onClick={() => {
            if (leftDrawerOpen) {
              setLeftDrawerOpen(false);
              setSelectedBed(null);
            }
            if (rightDrawerOpen) {
              setRightDrawerOpen(false);
            }
          }}
          style={{
            position: "fixed",
            top: "var(--topbar-height)",
            left: 0,
            right: 0,
            bottom: "var(--agentbar-height)",
          }}
        >
          <GardenView />
        </main>

        {/* Left drawer - Bed details */}
        <Drawer
          isOpen={leftDrawerOpen}
          onClose={() => {
            setLeftDrawerOpen(false);
            setSelectedBed(null);
          }}
          side="left"
          width={380}
          title="Garden Details"
        >
          <BedDetailsPanel />
        </Drawer>

        {/* Right drawer - Research */}
        <Drawer
          isOpen={rightDrawerOpen}
          onClose={() => setRightDrawerOpen(false)}
          side="right"
          width={480}
          noHeader
        >
          <Routes>
            <Route path="/" element={<ResearchPanel onClose={() => setRightDrawerOpen(false)} />} />
            <Route path="/research/*" element={<ResearchPanel onClose={() => setRightDrawerOpen(false)} />} />
          </Routes>
        </Drawer>

        {/* Agent bar */}
        <AgentBar />
      </div>
    </BrowserRouter>
  );
}

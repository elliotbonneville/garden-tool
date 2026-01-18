import { useState } from "react";
import { Routes, Route } from "react-router";
import { GardenView } from "../GardenView";
import { ResearchPanel } from "../research";
import { BedDetailsPanel } from "../BedDetailsPanel";
import { AgentBar } from "./AgentBar";
import { MobileTopBar } from "./MobileTopBar";
import { useGardenStore } from "../../store/gardenStore";

type MobileView = "garden" | "details" | "research" | "chat";

export function MobileLayout() {
  const [activeView, setActiveView] = useState<MobileView>("garden");
  const { selectedBed, setAgentBarExpanded } = useGardenStore();

  // Handlers to open views (passed to MobileTopBar)
  const handleOpenResearch = () => {
    setActiveView("research");
  };

  const handleOpenDetails = () => {
    setActiveView("details");
  };

  const handleOpenChat = () => {
    setActiveView("chat");
    setAgentBarExpanded(true);
  };

  const handleCloseChat = () => {
    setActiveView("garden");
    setAgentBarExpanded(false);
  };

  // The active view is what the user selected
  const effectiveView = activeView;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-canvas)",
      }}
    >
      {/* Top bar with menu */}
      <MobileTopBar onOpenResearch={handleOpenResearch} onOpenDetails={handleOpenDetails} />
      {/* Main content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Garden View */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: effectiveView === "garden" ? "block" : "none",
          }}
        >
          <GardenView onBedSelect={() => setActiveView("details")} />
        </div>

        {/* Details Panel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: effectiveView === "details" ? "flex" : "none",
            flexDirection: "column",
            background: "var(--bg-primary)",
          }}
        >
          <BedDetailsPanel onClose={() => setActiveView("garden")} />
        </div>

        {/* Research Panel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: effectiveView === "research" ? "flex" : "none",
            flexDirection: "column",
            background: "var(--bg-primary)",
          }}
        >
          <Routes>
            <Route path="/" element={<ResearchPanel mode="compact" onClose={() => setActiveView("garden")} />} />
            <Route path="/research/*" element={<ResearchPanel mode="compact" onClose={() => setActiveView("garden")} />} />
          </Routes>
        </div>

        {/* Chat Panel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: effectiveView === "chat" ? "flex" : "none",
            flexDirection: "column",
            background: "var(--bg-elevated)",
          }}
        >
          <AgentBar forceExpanded onClose={handleCloseChat} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="mobile-nav-bar">
        <NavItem
          icon={<GardenIcon />}
          label="Garden"
          active={effectiveView === "garden"}
          onClick={() => setActiveView("garden")}
        />
        <NavItem
          icon={<DetailsIcon />}
          label="Details"
          active={effectiveView === "details"}
          onClick={() => setActiveView("details")}
          badge={selectedBed ? "1" : undefined}
        />
        <NavItem
          icon={<ResearchIcon />}
          label="Research"
          active={effectiveView === "research"}
          onClick={() => setActiveView("research")}
        />
        <NavItem
          icon={<ChatIcon />}
          label="Chat"
          active={effectiveView === "chat"}
          onClick={handleOpenChat}
        />
      </nav>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}

function NavItem({ icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <button
      className={`mobile-nav-item ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 12,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--accent-secondary)",
            color: "var(--text-inverted)",
            fontSize: 10,
            fontWeight: "var(--weight-semibold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Icons
function GardenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function ResearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

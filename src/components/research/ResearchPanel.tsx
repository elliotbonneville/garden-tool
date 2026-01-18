import { useLocation, useNavigate } from "react-router";
import { useMemo } from "react";
import { useGardenStore } from "../../store/gardenStore";
import { useResearchDocs } from "./useResearchDocs";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ResearchHeader } from "./ResearchHeader";
import { ResearchContent } from "./ResearchContent";
import { ResearchNavCompact } from "./ResearchNavCompact";
import { ResearchNavExpanded } from "./ResearchNavExpanded";
import type { NavMode } from "./types";

interface ResearchPanelProps {
  onClose?: () => void;
  mode?: NavMode;
}

export function ResearchPanel({ onClose, mode }: ResearchPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Get state from store
  const {
    researchNavMode,
    toggleResearchNavMode,
    expandedFolders,
    toggleFolder,
    setRightPaneVisible,
  } = useGardenStore();

  // Responsive padding
  const contentPadding = isMobile ? "var(--space-4)" : "var(--space-6)";

  // Use passed mode or store mode
  const navMode = mode ?? researchNavMode;

  // Get doc tree
  const { tree } = useResearchDocs();

  // Extract slug from path
  const pathMatch = location.pathname.match(/^\/research\/(.+)$/);
  const slug = pathMatch?.[1] || "plan";

  // Convert expandedFolders array to Set for efficient lookup
  const expandedFoldersSet = useMemo(
    () => new Set(expandedFolders),
    [expandedFolders]
  );

  const handleNavigate = (newSlug: string) => {
    if (newSlug !== slug) {
      navigate(newSlug === "plan" ? "/" : `/research/${newSlug}`);
    }
  };

  const handleClose = () => {
    setRightPaneVisible(false);
    onClose?.();
  };

  // Compact mode layout
  if (navMode === "compact") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "var(--bg-primary)",
          fontFamily: "var(--font-body)",
        }}
      >
        <ResearchHeader
          slug={slug}
          navMode={navMode}
          onToggleMode={toggleResearchNavMode}
          onClose={handleClose}
          onNavigate={handleNavigate}
        />

        <div style={{ position: "relative" }}>
          <ResearchNavCompact
            tree={tree}
            activeSlug={slug}
            expandedFolders={expandedFoldersSet}
            onToggleFolder={toggleFolder}
            onSelectDoc={handleNavigate}
          />
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: contentPadding,
          }}
        >
          <ResearchContent slug={slug} onNavigate={handleNavigate} />
        </div>
      </div>
    );
  }

  // Expanded mode layout
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        fontFamily: "var(--font-body)",
      }}
    >
      <ResearchHeader
        slug={slug}
        navMode={navMode}
        onToggleMode={toggleResearchNavMode}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* On mobile, hide the expanded nav sidebar */}
        {!isMobile && (
          <ResearchNavExpanded
            tree={tree}
            activeSlug={slug}
            expandedFolders={expandedFoldersSet}
            onToggleFolder={toggleFolder}
            onSelectDoc={handleNavigate}
          />
        )}

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: contentPadding,
          }}
        >
          <ResearchContent slug={slug} onNavigate={handleNavigate} />
        </div>
      </div>
    </div>
  );
}

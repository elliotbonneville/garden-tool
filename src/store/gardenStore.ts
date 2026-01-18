import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutBed, GardenLayout } from "../schemas/layout";
import type { NavMode } from "../components/research/types";

type DetailsTab = "overview" | "details" | "analysis";

interface GardenStore {
  // Layout state
  selectedLayout: string;
  setSelectedLayout: (layout: string) => void;

  // Full layout data
  layoutData: GardenLayout | null;
  setLayoutData: (layout: GardenLayout | null) => void;

  // Bed selection
  selectedBed: LayoutBed | null;
  setSelectedBed: (bed: LayoutBed | null) => void;

  // Details panel tab
  detailsTab: DetailsTab;
  setDetailsTab: (tab: DetailsTab) => void;

  // Sun/time of day
  sunTime: number;
  setSunTime: (time: number) => void;

  // Day of year (1-365)
  dayOfYear: number;
  setDayOfYear: (day: number) => void;

  // Panel visibility
  leftPaneVisible: boolean;
  rightPaneVisible: boolean;
  setLeftPaneVisible: (visible: boolean) => void;
  setRightPaneVisible: (visible: boolean) => void;

  // Research navigation
  researchNavMode: NavMode;
  setResearchNavMode: (mode: NavMode) => void;
  toggleResearchNavMode: () => void;
  expandedFolders: string[];
  toggleFolder: (path: string) => void;

  // Drawer widths
  leftDrawerWidth: number;
  rightDrawerWidth: number;
  setLeftDrawerWidth: (width: number) => void;
  setRightDrawerWidth: (width: number) => void;

  // Agent bar
  agentBarHeight: number;
  agentBarExpanded: boolean;
  agentBarFullscreen: boolean;
  setAgentBarHeight: (height: number) => void;
  setAgentBarExpanded: (expanded: boolean) => void;
  setAgentBarFullscreen: (fullscreen: boolean) => void;
  closeAgentBar: () => void;

  // View options
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
}

export const useGardenStore = create<GardenStore>()(
  persist(
    (set) => ({
      // Layout state
      selectedLayout: "",
      setSelectedLayout: (layout) => set({ selectedLayout: layout, selectedBed: null, layoutData: null }),

      // Full layout data
      layoutData: null,
      setLayoutData: (layout) => set({ layoutData: layout }),

      // Bed selection
      selectedBed: null,
      setSelectedBed: (bed) => set((state) => ({
        selectedBed: bed,
        // Auto-show left pane and switch to details tab when bed selected
        leftPaneVisible: bed ? true : state.leftPaneVisible,
        detailsTab: bed ? "details" : state.detailsTab,
      })),

      // Details panel tab
      detailsTab: "overview",
      setDetailsTab: (tab) => set({ detailsTab: tab }),

      // Sun/time of day
      sunTime: 12,
      setSunTime: (time) => set({ sunTime: time }),

      // Day of year (default to June 21 = summer solstice, day 172)
      dayOfYear: 172,
      setDayOfYear: (day) => set({ dayOfYear: day }),

      // Panel visibility - research hidden by default for cleaner view
      leftPaneVisible: true,
      rightPaneVisible: false,
      setLeftPaneVisible: (visible) => set({ leftPaneVisible: visible }),
      setRightPaneVisible: (visible) => set({ rightPaneVisible: visible }),

      // Research navigation
      researchNavMode: "compact",
      setResearchNavMode: (mode) => set({ researchNavMode: mode }),
      toggleResearchNavMode: () => set((state) => ({
        researchNavMode: state.researchNavMode === "compact" ? "expanded" : "compact",
      })),
      expandedFolders: [],
      toggleFolder: (path) => set((state) => ({
        expandedFolders: state.expandedFolders.includes(path)
          ? state.expandedFolders.filter((p) => p !== path)
          : [...state.expandedFolders, path],
      })),

      // Drawer widths
      leftDrawerWidth: 380,
      rightDrawerWidth: 480,
      setLeftDrawerWidth: (width) => set({ leftDrawerWidth: width }),
      setRightDrawerWidth: (width) => set({ rightDrawerWidth: width }),

      // Agent bar
      agentBarHeight: 300,
      agentBarExpanded: false,
      agentBarFullscreen: false,
      setAgentBarHeight: (height) => set({ agentBarHeight: height }),
      setAgentBarExpanded: (expanded) => set({ agentBarExpanded: expanded }),
      setAgentBarFullscreen: (fullscreen) => set({
        agentBarFullscreen: fullscreen,
        agentBarExpanded: true, // Keep expanded when toggling fullscreen (exit returns to resizable)
      }),
      closeAgentBar: () => set({
        agentBarExpanded: false,
        agentBarFullscreen: false,
      }),

      // View options
      showGrid: false,
      setShowGrid: (show) => set({ showGrid: show }),
    }),
    {
      name: "garden-store",
      partialize: (state) => ({
        // Persist research navigation and drawer widths
        researchNavMode: state.researchNavMode,
        expandedFolders: state.expandedFolders,
        leftDrawerWidth: state.leftDrawerWidth,
        rightDrawerWidth: state.rightDrawerWidth,
        agentBarHeight: state.agentBarHeight,
      }),
    }
  )
);

import { create } from "zustand";
import type { LayoutBed, GardenLayout } from "../schemas/layout";

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

  // Panel visibility
  leftPaneVisible: boolean;
  rightPaneVisible: boolean;
  setLeftPaneVisible: (visible: boolean) => void;
  setRightPaneVisible: (visible: boolean) => void;
}

export const useGardenStore = create<GardenStore>((set) => ({
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

  // Panel visibility - research hidden by default for cleaner view
  leftPaneVisible: true,
  rightPaneVisible: false,
  setLeftPaneVisible: (visible) => set({ leftPaneVisible: visible }),
  setRightPaneVisible: (visible) => set({ rightPaneVisible: visible }),
}));

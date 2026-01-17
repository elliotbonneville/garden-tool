import { create } from "zustand";
import type { LayoutBed } from "../schemas/layout";

interface GardenInfo {
  name: string;
  dimensions: { width: number; length: number };
  bedCount: number;
}

interface GardenStore {
  // Layout state
  selectedLayout: string;
  setSelectedLayout: (layout: string) => void;

  // Bed selection
  selectedBed: LayoutBed | null;
  setSelectedBed: (bed: LayoutBed | null) => void;

  // Garden info
  gardenInfo: GardenInfo | null;
  setGardenInfo: (info: GardenInfo | null) => void;

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
  setSelectedLayout: (layout) => set({ selectedLayout: layout, selectedBed: null }),

  // Bed selection
  selectedBed: null,
  setSelectedBed: (bed) => set((state) => ({
    selectedBed: bed,
    // Auto-show left pane when bed selected
    leftPaneVisible: bed ? true : state.leftPaneVisible,
  })),

  // Garden info
  gardenInfo: null,
  setGardenInfo: (info) => set({ gardenInfo: info }),

  // Sun/time of day
  sunTime: 12,
  setSunTime: (time) => set({ sunTime: time }),

  // Panel visibility
  leftPaneVisible: true,
  rightPaneVisible: true,
  setLeftPaneVisible: (visible) => set({ leftPaneVisible: visible }),
  setRightPaneVisible: (visible) => set({ rightPaneVisible: visible }),
}));

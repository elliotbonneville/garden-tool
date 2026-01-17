import { z } from "zod";

export const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const PlantTypeSchema = z.enum([
  "flower",
  "shrub",
  "tree",
  "vegetable",
  "herb",
  "grass",
]);

export const PlantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: PlantTypeSchema,
  position: Vector3Schema,
  scale: z.number().positive().default(1),
  color: ColorSchema.default("#228B22"),
});

export const BedFrameMaterialSchema = z.enum([
  "galvanized_metal",
  "cedar",
  "pine",
  "concrete_block",
  "none",
]).default("cedar");

export const GardenBedSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  position: Vector3Schema,
  dimensions: z.object({
    width: z.number().positive(),
    length: z.number().positive(),
    height: z.number().nonnegative().default(0.2),
  }),
  frameMaterial: BedFrameMaterialSchema,
  soilColor: ColorSchema.default("#8B4513"),
  plants: z.array(PlantSchema).default([]),
});

export const PathSchema = z.object({
  id: z.string().uuid(),
  points: z.array(Vector3Schema).min(2),
  width: z.number().positive().default(1),
  material: z.enum(["gravel", "stone", "brick", "wood"]).default("gravel"),
});

export const FenceGateSchema = z.object({
  position: z.enum(["north", "south", "east", "west"]),
  offset: z.number(), // Distance from west (for N/S) or north (for E/W) edge to gate center
  width: z.number().positive(),
});

export const FenceSchema = z.object({
  type: z.enum(["deer_mesh", "wire", "wood", "none"]),
  height: z.number().positive(),
  position: Vector3Schema, // Top-left corner (x, 0, z)
  dimensions: z.object({
    width: z.number().positive(), // X extent
    length: z.number().positive(), // Z extent
  }),
  gates: z.array(FenceGateSchema).default([]),
});

// Scattered plant for rendering (positioned in world space, not in a bed)
export const ScatteredPlantRenderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: PlantTypeSchema,
  position: Vector3Schema.describe("World position (x, y, z)"),
  scale: z.number().positive().default(1),
  color: ColorSchema.default("#ff69b4"),
});

export const GardenSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  dimensions: z.object({
    width: z.number().positive(),
    length: z.number().positive(),
  }),
  beds: z.array(GardenBedSchema).default([]),
  paths: z.array(PathSchema).default([]),
  fence: FenceSchema.optional(),
  groundColor: ColorSchema.default("#7CFC00"),
  scatteredPlants: z.array(ScatteredPlantRenderSchema).default([]),
});

export type Vector3 = z.infer<typeof Vector3Schema>;
export type Plant = z.infer<typeof PlantSchema>;
export type PlantType = z.infer<typeof PlantTypeSchema>;
export type BedFrameMaterial = z.infer<typeof BedFrameMaterialSchema>;
export type GardenBed = z.infer<typeof GardenBedSchema>;
export type Path = z.infer<typeof PathSchema>;
export type FenceGate = z.infer<typeof FenceGateSchema>;
export type Fence = z.infer<typeof FenceSchema>;
export type ScatteredPlantRender = z.infer<typeof ScatteredPlantRenderSchema>;
export type Garden = z.infer<typeof GardenSchema>;

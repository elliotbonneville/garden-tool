import { z } from "zod";

// ============================================
// Garden Layout Schema
// For planning/research data (complements garden.ts for app rendering)
// ============================================
//
// COORDINATE SYSTEM:
// - Origin (0,0) is the TOP-LEFT (northwest) corner of the garden
// - X axis runs LEFT to RIGHT (west to east)
// - Y axis runs TOP to BOTTOM (north to south)
// - All measurements are in FEET
//
// POSITIONING:
// - position.x = distance from the LEFT (west) edge to the bed's left edge
// - position.y = distance from the TOP (north) edge to the bed's top edge
// - Beds must fit within the site dimensions (0 to site.width for X, 0 to site.length for Y)
//
// DIMENSIONS:
// - width = horizontal extent (X direction, west-to-east)
// - length = vertical extent (Y direction, north-to-south)
// - A bed at position (x, y) with dimensions (width, length) occupies:
//   X: from x to (x + width)
//   Y: from y to (y + length)
//
// EXAMPLE for a 40x40 garden with a 4x8 bed:
// - Site: { width: 40, length: 40 }
// - Bed: position { x: 3, y: 3 }, dimensions { width: 4, length: 8 }
// - This bed's left edge is 3ft from west fence
// - This bed's top edge is 3ft from north fence
// - This bed extends from x=3 to x=7 (4ft wide)
// - This bed extends from y=3 to y=11 (8ft long)
//
// VALIDATION:
// - All beds must satisfy: x + width <= site.width
// - All beds must satisfy: y + length <= site.length
// - Paths between beds should be at least 2-3ft for access
// ============================================

export const PositionSchema = z.object({
  x: z.number().describe("X position in feet from LEFT (west) edge of garden to bed's left edge"),
  y: z.number().describe("Y position in feet from TOP (north) edge of garden to bed's top edge"),
});

export const DimensionsSchema = z.object({
  width: z.number().describe("Width in feet (X direction, west-to-east extent)"),
  length: z.number().describe("Length in feet (Y direction, north-to-south extent)"),
  height: z.number().optional().describe("Height in inches (for raised beds)"),
});

export const BedTypeSchema = z.enum(["vegetable", "flower", "perennial", "berry"]);

export const BedMaterialSchema = z.enum([
  "galvanized_metal",
  "cedar",
  "pine",
  "concrete_block",
  "none",
]);

export const LayoutBedSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().describe("Markdown-formatted description with reasoning, layout suggestions, and cautions"),
  type: BedTypeSchema,
  position: PositionSchema,
  dimensions: DimensionsSchema,
  material: BedMaterialSchema,
  crops: z.array(z.string()).describe("Assigned crops for this bed"),
  notes: z.string().optional(),
});

export const FenceTypeSchema = z.enum(["deer_mesh", "wire", "wood", "none"]);

// Fence position uses absolute coordinates matching the bed coordinate system:
// - position.x, position.y = top-left corner of the fenced area
// - dimensions.width = fence extent in X direction (west-to-east)
// - dimensions.length = fence extent in Y direction (north-to-south)
// - The fence surrounds the area from (x, y) to (x + width, y + length)
export const FenceSchema = z.object({
  type: FenceTypeSchema,
  height_ft: z.number().describe("Height of fence in feet"),
  material: z.string().describe("Fence material description"),
  position: PositionSchema.describe("Top-left (northwest) corner of fenced area"),
  dimensions: z.object({
    width: z.number().describe("Fence width in feet (X direction)"),
    length: z.number().describe("Fence length in feet (Y direction)"),
  }).describe("Size of the fenced area"),
  gates: z.array(
    z.object({
      position: z.enum(["north", "south", "east", "west"]).describe("Which side of fence the gate is on"),
      offset_ft: z.number().describe("Distance from the west (for N/S gates) or north (for E/W gates) edge to gate center"),
      width_ft: z.number().describe("Width of the gate opening in feet"),
    })
  ).describe("Gate openings in the fence"),
});

export const RodentProtectionSchema = z.object({
  type: z.enum(["hardware_cloth", "none"]),
  mesh_size_inches: z.number(),
  installation: z.enum(["bottom_only", "bottom_and_buried_sides"]),
});

// Support post for bird netting structure
export const BirdNettingSupportPostSchema = z.object({
  id: z.string(),
  position: PositionSchema.describe("Position of the support post"),
  height_ft: z.number().describe("Height of the support post in feet (should be taller than fence)"),
});

// Cable/wire run between support points
export const BirdNettingCableSchema = z.object({
  from: z.string().describe("ID of start post (or 'fence_corner_nw', 'fence_corner_ne', etc.)"),
  to: z.string().describe("ID of end post (or fence corner)"),
});

export const BirdProtectionSchema = z.object({
  type: z.enum(["netting_full_garden", "netting_with_frame", "netting_draped", "none"]),
  areas: z.array(z.string()).optional().describe("Bed IDs that need bird protection (for partial coverage)"),
  // Full garden netting configuration
  support_posts: z.array(BirdNettingSupportPostSchema).optional().describe("Internal support posts for the netting"),
  cables: z.array(BirdNettingCableSchema).optional().describe("Cable runs between supports"),
  mesh_color: z.string().optional().default("#222222").describe("Color of the bird netting mesh"),
  sag_factor: z.number().min(0).max(1).optional().default(0.15).describe("How much the mesh sags between supports (0 = taut, 1 = maximum sag)"),
  peak_height_ft: z.number().optional().describe("Height at the peak/center of the netting"),
});

export const ProtectionSchema = z.object({
  deer: FenceSchema,
  rodent: RodentProtectionSchema,
  bird: BirdProtectionSchema,
});

export const WaterSourceSchema = z.object({
  type: z.enum(["hose_faucet", "well", "rain_barrel"]),
  distance_ft: z.number().describe("Distance from garden edge"),
});

export const IrrigationSchema = z.object({
  type: z.enum(["drip_with_timer", "soaker_hose", "manual", "none"]),
  water_source: WaterSourceSchema,
});

export const GrowingMethodSchema = z.object({
  type: z.enum(["back_to_eden", "traditional", "no_dig", "hugelkultur"]),
  mulch_type: z.string(),
  base_layers: z.array(z.string()),
});

export const LocationSchema = z.object({
  city: z.string(),
  state: z.string(),
  usda_zone: z.string(),
});

export const MetadataSchema = z.object({
  name: z.string(),
  location: LocationSchema,
  created_date: z.string(),
  updated_date: z.string().optional(),
  families: z.number(),
  people: z.object({
    adults: z.number(),
    children: z.number(),
  }),
});

export const DifficultySchema = z.enum(["beginner", "intermediate", "advanced"]);

export const GardenSummarySchema = z.object({
  difficulty: DifficultySchema.describe("Overall difficulty rating for this garden layout"),
  overview: z.string().describe("Markdown-formatted overview of the garden, its philosophy, and what to expect"),
  time_commitment: z.object({
    peak_season_hours_per_week: z.number().describe("Expected hours per week during peak growing season (Jun-Aug)"),
    off_season_hours_per_week: z.number().describe("Expected hours per week during off season"),
    spring_setup_hours: z.number().describe("One-time spring setup/planting hours"),
    fall_cleanup_hours: z.number().describe("Fall cleanup and winterization hours"),
  }),
  water_requirements: z.object({
    gallons_per_week_peak: z.number().describe("Gallons per week during hot/dry peak season"),
    gallons_per_week_average: z.number().describe("Average gallons per week across growing season"),
    notes: z.string().describe("Notes about irrigation approach"),
  }),
  tips: z.array(z.string()).describe("Key tips and reminders for working this garden"),
});

export const SiteSchema = z.object({
  dimensions: z.object({
    width: z.number().describe("Total garden width in feet (X direction, west-to-east)"),
    length: z.number().describe("Total garden length in feet (Y direction, north-to-south)"),
  }).describe("Garden boundary dimensions - all beds must fit within (0,0) to (width,length)"),
  total_sqft: z.number(),
  sun_hours: z.number(),
  soil_type: z.string(),
  terrain: z.enum(["flat", "sloped", "terraced"]),
});

// Legacy paths config (for auto-generation)
export const PathsConfigSchema = z.object({
  main_width_ft: z.number(),
  secondary_width_ft: z.number(),
  material: z.string(),
});

// Explicit path definition with absolute coordinates
// Points are in the same coordinate system as beds: (0,0) = northwest corner
export const PathDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  points: z.array(PositionSchema).min(2).describe("Path waypoints from start to end"),
  width_ft: z.number().describe("Width of the path in feet"),
  material: z.enum(["gravel", "stone", "brick", "wood", "wood_chips"]),
});

// Ground/grass area definition
export const GroundAreaSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  position: PositionSchema.describe("Top-left corner of the ground area"),
  dimensions: z.object({
    width: z.number().describe("Width in feet (X direction)"),
    length: z.number().describe("Length in feet (Y direction)"),
  }),
  type: z.enum(["grass", "mulch", "gravel", "paved"]),
  color: z.string().optional().describe("Hex color override"),
});

// Structure definition (sheds, compost bins, water barrels, etc.)
export const StructureSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["shed", "compost_bin", "rain_barrel", "cold_frame", "greenhouse", "trellis", "other"]),
  position: PositionSchema,
  dimensions: z.object({
    width: z.number(),
    length: z.number(),
    height: z.number().optional(),
  }),
  notes: z.string().optional(),
});

// Scattered plants - flowers, ground cover, etc. placed randomly around the garden
export const ScatteredPlantSchema = z.object({
  type: z.string().describe("Plant type, e.g. 'zinnia', 'marigold', 'sunflower'"),
  color: z.string().optional().describe("Hex color for the plant"),
  count: z.number().describe("Number of plants to scatter"),
  area: z.object({
    x_min: z.number().describe("Minimum X position (from left edge)"),
    x_max: z.number().describe("Maximum X position"),
    y_min: z.number().describe("Minimum Y position (from top edge)"),
    y_max: z.number().describe("Maximum Y position"),
  }).optional().describe("Bounding area for scattering. If omitted, scatters throughout garden avoiding beds."),
  avoid_beds: z.boolean().default(true).describe("Whether to avoid placing plants inside beds"),
  scale_range: z.object({
    min: z.number().default(0.6),
    max: z.number().default(1.2),
  }).optional().describe("Random scale range for variety"),
});

export const ScatteredPlantsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  plants: z.array(ScatteredPlantSchema),
});

export const MaterialsBudgetSchema = z.object({
  beds: z.number(),
  fence: z.number(),
  hardware_cloth: z.number(),
  soil_compost: z.number(),
  irrigation: z.number(),
  bird_netting: z.number(),
});

export const LaborBudgetSchema = z.object({
  estimated_hours: z.number(),
  rate_per_hour: z.number(),
  total: z.number(),
});

export const BudgetSchema = z.object({
  materials: MaterialsBudgetSchema,
  labor: LaborBudgetSchema,
  total: z.number(),
});

export const TimelineSchema = z.object({
  start_date: z.string(),
  build_phase: z.object({
    start: z.string(),
    end: z.string(),
  }),
  planting_date: z.string(),
  first_harvest: z.string(),
});

export const ClimateSchema = z.object({
  last_frost: z.string(),
  first_frost: z.string(),
  growing_days: z.number(),
});

// ============================================
// Main Layout Schema
// ============================================

export const GardenLayoutSchema = z.object({
  version: z.string(),
  metadata: MetadataSchema,
  summary: GardenSummarySchema.optional().describe("Overview, difficulty, time commitment, and tips for working this garden"),
  site: SiteSchema,
  growing_method: GrowingMethodSchema,
  beds: z.array(LayoutBedSchema),
  paths: PathsConfigSchema.describe("Default path configuration for auto-generation"),
  explicit_paths: z.array(PathDefinitionSchema).optional().describe("Explicitly defined paths with coordinates"),
  ground_areas: z.array(GroundAreaSchema).optional().describe("Custom ground/surface areas"),
  structures: z.array(StructureSchema).optional().describe("Sheds, compost bins, water features, etc."),
  scattered_plants: ScatteredPlantsConfigSchema.optional().describe("Pollinator flowers and other plants scattered around the garden outside beds"),
  protection: ProtectionSchema,
  irrigation: IrrigationSchema,
  budget: BudgetSchema,
  timeline: TimelineSchema,
  climate: ClimateSchema,
});

// ============================================
// Type Exports
// ============================================

export type Position = z.infer<typeof PositionSchema>;
export type Dimensions = z.infer<typeof DimensionsSchema>;
export type BedType = z.infer<typeof BedTypeSchema>;
export type BedMaterial = z.infer<typeof BedMaterialSchema>;
export type LayoutBed = z.infer<typeof LayoutBedSchema>;
export type LayoutFence = z.infer<typeof FenceSchema>;
export type RodentProtection = z.infer<typeof RodentProtectionSchema>;
export type BirdNettingSupportPost = z.infer<typeof BirdNettingSupportPostSchema>;
export type BirdNettingCable = z.infer<typeof BirdNettingCableSchema>;
export type BirdProtection = z.infer<typeof BirdProtectionSchema>;
export type Protection = z.infer<typeof ProtectionSchema>;
export type WaterSource = z.infer<typeof WaterSourceSchema>;
export type Irrigation = z.infer<typeof IrrigationSchema>;
export type GrowingMethod = z.infer<typeof GrowingMethodSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type PathsConfig = z.infer<typeof PathsConfigSchema>;
export type PathDefinition = z.infer<typeof PathDefinitionSchema>;
export type GroundArea = z.infer<typeof GroundAreaSchema>;
export type Structure = z.infer<typeof StructureSchema>;
export type ScatteredPlant = z.infer<typeof ScatteredPlantSchema>;
export type ScatteredPlantsConfig = z.infer<typeof ScatteredPlantsConfigSchema>;
export type MaterialsBudget = z.infer<typeof MaterialsBudgetSchema>;
export type LaborBudget = z.infer<typeof LaborBudgetSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type Climate = z.infer<typeof ClimateSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type GardenSummary = z.infer<typeof GardenSummarySchema>;
export type GardenLayout = z.infer<typeof GardenLayoutSchema>;

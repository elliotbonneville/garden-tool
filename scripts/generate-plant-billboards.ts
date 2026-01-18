#!/usr/bin/env npx tsx
/**
 * Plant Billboard Generator
 *
 * Generates realistic plant images using OpenAI's GPT Image API for use as
 * 3D billboards in the garden renderer.
 *
 * Usage:
 *   npx tsx scripts/generate-plant-billboards.ts [options]
 *
 * Options:
 *   --dry-run         List plants without generating images
 *   --skip-existing   Skip plants that already have images
 *   --only <plants>   Only generate specific plants (comma-separated)
 *   --quality <q>     Image quality: "low" or "high" (default: "high")
 *   --help            Show this help message
 *
 * Environment:
 *   OPENAI_API_KEY    Required API key for OpenAI
 */

import OpenAI from "openai";
import * as fs from "fs/promises";
import * as path from "path";

// All plant types from the garden layout
const PLANT_TYPES = [
  // Nightshades
  "tomato_cherry",
  "tomato_slicing",
  "tomato_paste",
  "bell_pepper",
  "hot_pepper",
  "eggplant",
  "tomatillo",
  "ground_cherry",
  // Squash
  "zucchini",
  "yellow_squash",
  "butternut_squash",
  "spaghetti_squash",
  "cucumber_slicing",
  "cucumber_pickling",
  "watermelon",
  // Greens
  "lettuce_leaf",
  "lettuce_romaine",
  "lettuce_butterhead",
  "arugula",
  "kale_curly",
  "collard_greens",
  "bok_choy",
  "mustard_greens",
  "swiss_chard",
  "spinach",
  // Root vegetables
  "carrot",
  "beet",
  "radish",
  "turnip",
  "parsnip",
  "potato",
  // Alliums
  "garlic_hardneck",
  "onion_yellow",
  "scallion",
  "shallot",
  // Legumes
  "bush_bean",
  "snap_pea",
  "edamame",
  // Brassicas
  "cauliflower",
  "cabbage",
  "broccoli_raab",
  // Herbs
  "basil",
  "cilantro",
  "parsley_flat",
  "parsley_curly",
  "dill",
  "chamomile",
  "stevia",
  "fennel_bulb",
  "oregano",
  "thyme",
  "rosemary",
  "sage",
  "tarragon",
  "lavender",
  // Flowers
  "zinnia",
  "cosmos",
  "sunflower",
  "marigold",
  // Perennials
  "asparagus",
  "rhubarb",
  "horseradish",
  // Berries
  "blueberry",
  "grape",
] as const;

type PlantType = (typeof PLANT_TYPES)[number];

// Human-readable names for better prompts
const PLANT_DISPLAY_NAMES: Record<PlantType, string> = {
  tomato_cherry: "cherry tomato",
  tomato_slicing: "slicing tomato",
  tomato_paste: "paste tomato",
  bell_pepper: "bell pepper",
  hot_pepper: "hot pepper",
  eggplant: "eggplant",
  tomatillo: "tomatillo",
  ground_cherry: "ground cherry",
  zucchini: "zucchini",
  yellow_squash: "yellow squash",
  butternut_squash: "butternut squash",
  spaghetti_squash: "spaghetti squash",
  cucumber_slicing: "slicing cucumber",
  cucumber_pickling: "pickling cucumber",
  watermelon: "watermelon",
  lettuce_leaf: "leaf lettuce",
  lettuce_romaine: "romaine lettuce",
  lettuce_butterhead: "butterhead lettuce",
  arugula: "arugula",
  kale_curly: "curly kale",
  collard_greens: "collard greens",
  bok_choy: "bok choy",
  mustard_greens: "mustard greens",
  swiss_chard: "swiss chard",
  spinach: "spinach",
  carrot: "carrot",
  beet: "beet",
  radish: "radish",
  turnip: "turnip",
  parsnip: "parsnip",
  potato: "potato",
  garlic_hardneck: "hardneck garlic",
  onion_yellow: "yellow onion",
  scallion: "scallion",
  shallot: "shallot",
  bush_bean: "bush bean",
  snap_pea: "snap pea",
  edamame: "edamame",
  cauliflower: "cauliflower",
  cabbage: "cabbage",
  broccoli_raab: "broccoli raab",
  basil: "basil",
  cilantro: "cilantro",
  parsley_flat: "flat-leaf parsley",
  parsley_curly: "curly parsley",
  dill: "dill",
  chamomile: "chamomile",
  stevia: "stevia",
  fennel_bulb: "fennel",
  oregano: "oregano",
  thyme: "thyme",
  rosemary: "rosemary",
  sage: "sage",
  tarragon: "tarragon",
  lavender: "lavender",
  zinnia: "zinnia",
  cosmos: "cosmos flower",
  sunflower: "sunflower",
  marigold: "marigold",
  asparagus: "asparagus",
  rhubarb: "rhubarb",
  horseradish: "horseradish",
  blueberry: "blueberry bush",
  grape: "grapevine",
};

interface Options {
  dryRun: boolean;
  skipExisting: boolean;
  only: PlantType[] | null;
  quality: "low" | "high";
}

const OUTPUT_DIR = path.join(
  process.cwd(),
  "public",
  "assets",
  "plants"
);

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    dryRun: false,
    skipExisting: false,
    only: null,
    quality: "high",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--skip-existing":
        options.skipExisting = true;
        break;
      case "--only":
        const plants = args[++i]?.split(",").map((p) => p.trim()) as PlantType[];
        if (!plants) {
          console.error("Error: --only requires a comma-separated list of plants");
          process.exit(1);
        }
        // Validate plant names
        for (const plant of plants) {
          if (!PLANT_TYPES.includes(plant)) {
            console.error(`Error: Unknown plant type: ${plant}`);
            console.error(`Valid types: ${PLANT_TYPES.join(", ")}`);
            process.exit(1);
          }
        }
        options.only = plants;
        break;
      case "--quality":
        const quality = args[++i];
        if (quality !== "low" && quality !== "high") {
          console.error('Error: --quality must be "low" or "high"');
          process.exit(1);
        }
        options.quality = quality;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Plant Billboard Generator

Generates realistic plant images using OpenAI's GPT Image API for use as
3D billboards in the garden renderer.

Usage:
  npx tsx scripts/generate-plant-billboards.ts [options]

Options:
  --dry-run         List plants without generating images
  --skip-existing   Skip plants that already have images
  --only <plants>   Only generate specific plants (comma-separated)
  --quality <q>     Image quality: "low" or "high" (default: "high")
  --help, -h        Show this help message

Environment:
  OPENAI_API_KEY    Required API key for OpenAI

Examples:
  # Generate all plants
  npx tsx scripts/generate-plant-billboards.ts

  # Generate specific plants only
  npx tsx scripts/generate-plant-billboards.ts --only tomato_cherry,bell_pepper

  # Resume interrupted generation
  npx tsx scripts/generate-plant-billboards.ts --skip-existing

  # Preview what would be generated
  npx tsx scripts/generate-plant-billboards.ts --dry-run

Available plants (${PLANT_TYPES.length}):
  ${PLANT_TYPES.join(", ")}
`);
}

function buildPrompt(plantType: PlantType): string {
  const displayName = PLANT_DISPLAY_NAMES[plantType];
  return `A realistic ${displayName} plant isolated on a transparent background, showing the complete above-ground growth. No dirt, no soil, no pot - just the plant itself floating with a clean cut at the base of the stem. Centered composition, studio lighting, high detail botanical photography style. Show the plant at its typical mature garden size with healthy leaves and any characteristic fruits, flowers, or vegetables if applicable. PNG with transparent background.`;
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateImage(
  client: OpenAI,
  plantType: PlantType,
  quality: "low" | "high"
): Promise<Buffer> {
  const prompt = buildPrompt(plantType);

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: quality === "high" ? "high" : "low",
  });

  const imageData = response.data[0];
  if (!imageData.b64_json) {
    throw new Error("No image data in response");
  }

  return Buffer.from(imageData.b64_json, "base64");
}

async function main(): Promise<void> {
  const options = parseArgs();

  // Validate API key
  if (!options.dryRun && !process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    console.error("Set it with: export OPENAI_API_KEY='sk-...'");
    process.exit(1);
  }

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Determine which plants to process
  const plantsToProcess = options.only ?? [...PLANT_TYPES];

  console.log(`\nPlant Billboard Generator`);
  console.log(`========================`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Quality: ${options.quality}`);
  console.log(`Plants to process: ${plantsToProcess.length}`);
  if (options.dryRun) console.log(`Mode: DRY RUN`);
  if (options.skipExisting) console.log(`Skipping existing images`);
  console.log();

  // Check existing images
  const existingImages: Set<string> = new Set();
  if (options.skipExisting) {
    for (const plant of plantsToProcess) {
      const imagePath = path.join(OUTPUT_DIR, `${plant}.png`);
      if (await fileExists(imagePath)) {
        existingImages.add(plant);
      }
    }
    if (existingImages.size > 0) {
      console.log(`Found ${existingImages.size} existing images to skip`);
    }
  }

  // Filter out existing images
  const plantsToGenerate = plantsToProcess.filter(
    (plant) => !existingImages.has(plant)
  );

  if (plantsToGenerate.length === 0) {
    console.log("All images already exist. Nothing to generate.");
    return;
  }

  console.log(`Will generate ${plantsToGenerate.length} images:\n`);
  for (const plant of plantsToGenerate) {
    console.log(`  - ${plant} (${PLANT_DISPLAY_NAMES[plant]})`);
  }
  console.log();

  if (options.dryRun) {
    console.log("Dry run complete. No images generated.");
    return;
  }

  // Initialize OpenAI client
  const client = new OpenAI();

  // Generate images
  let successCount = 0;
  let errorCount = 0;
  const errors: { plant: string; error: string }[] = [];

  for (let i = 0; i < plantsToGenerate.length; i++) {
    const plant = plantsToGenerate[i];
    const displayName = PLANT_DISPLAY_NAMES[plant];
    const progress = `[${i + 1}/${plantsToGenerate.length}]`;

    console.log(`${progress} Generating ${plant} (${displayName})...`);

    const outputPath = path.join(OUTPUT_DIR, `${plant}.png`);

    // Retry logic
    const maxRetries = 3;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const imageBuffer = await generateImage(client, plant, options.quality);
        await fs.writeFile(outputPath, imageBuffer);
        console.log(`  -> Saved to ${outputPath}`);
        successCount++;
        success = true;
        break;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  -> Attempt ${attempt}/${maxRetries} failed: ${errorMessage}`);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`  -> Retrying in ${delay / 1000}s...`);
          await sleep(delay);
        }
      }
    }

    if (!success) {
      errorCount++;
      errors.push({
        plant,
        error: "Failed after 3 attempts",
      });
      console.error(`  -> FAILED: ${plant}`);
    }

    // Rate limiting - wait between requests
    if (i < plantsToGenerate.length - 1) {
      await sleep(1000); // 1 second between requests
    }
  }

  // Summary
  console.log(`\n========== Summary ==========`);
  console.log(`Total: ${plantsToGenerate.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\nFailed plants:`);
    for (const { plant, error } of errors) {
      console.log(`  - ${plant}: ${error}`);
    }
    console.log(`\nRetry failed plants with:`);
    console.log(
      `  npx tsx scripts/generate-plant-billboards.ts --only ${errors.map((e) => e.plant).join(",")}`
    );
    process.exit(1);
  }

  console.log(`\nAll images generated successfully!`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

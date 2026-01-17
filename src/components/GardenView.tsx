import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GardenRenderer } from "../scene/GardenRenderer";
import { type Garden, type GardenBed, type Plant, type PlantType, type Fence, type BirdNetting } from "../schemas/garden";
import { GardenLayoutSchema, type GardenLayout } from "../schemas/layout";
import { useGardenStore } from "../store/gardenStore";

// Dynamically import all layout JSON files from research directory
const layoutModules = import.meta.glob("../../research/*.layout.json", { eager: false });

// Build list of available layouts from filenames
const availableLayouts: { slug: string; name: string }[] = [];
const layoutLoaders: Record<string, () => Promise<unknown>> = {};

for (const path of Object.keys(layoutModules)) {
  const match = path.match(/\/([^/]+)\.layout\.json$/);
  if (match && match[1]) {
    const slug = match[1];
    const name = slug
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    availableLayouts.push({ slug, name });
    layoutLoaders[slug] = layoutModules[path] as () => Promise<unknown>;
  }
}

// Sort alphabetically
availableLayouts.sort((a, b) => a.name.localeCompare(b.name));

// Export for use in other components
export { availableLayouts };

export function GardenView() {
  const {
    selectedLayout,
    selectedBed,
    setSelectedBed,
    setGardenInfo,
    sunTime,
  } = useGardenStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GardenRenderer | null>(null);
  const layoutRef = useRef<GardenLayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [garden, setGarden] = useState<Garden | null>(null);
  const [layoutData, setLayoutData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  // Load layout data when selection changes
  useEffect(() => {
    if (!selectedLayout || !layoutLoaders[selectedLayout]) {
      setLoading(false);
      if (!selectedLayout) {
        setError("No layout selected.");
      } else {
        setError("No layouts found. Create a .layout.json file in the research directory.");
      }
      return;
    }

    setLoading(true);
    setError(null);

    layoutLoaders[selectedLayout]()
      .then((module) => {
        const data = (module as { default?: unknown }).default || module;
        setLayoutData(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(`Failed to load layout: ${e instanceof Error ? e.message : String(e)}`);
        setLoading(false);
      });
  }, [selectedLayout]);

  // Parse layout when data loads
  useEffect(() => {
    if (!layoutData) return;

    try {
      const layout = GardenLayoutSchema.parse(layoutData);
      layoutRef.current = layout;

      const cropColors: Record<string, string> = {
        tomato: "#2d5a27", pepper: "#228b22", eggplant: "#2e8b2e",
        zucchini: "#3cb371", squash: "#2e8b57", cucumber: "#228b22",
        bean: "#228b22", lettuce: "#90ee90", spinach: "#228b22",
        arugula: "#6b8e23", kale: "#2e8b57", chard: "#32cd32",
        carrot: "#228b22", beet: "#2e8b57", radish: "#228b22",
        potato: "#228b22", garlic: "#6b8e23", onion: "#228b22",
        asparagus: "#228b22", rhubarb: "#8b0000", oregano: "#6b8e23",
        thyme: "#556b2f", chives: "#9acd32", sage: "#6b8e23",
        zinnia: "#ff69b4", cosmos: "#dda0dd", sunflower: "#ffd700",
        marigold: "#ffa500", strawberry: "#228b22", raspberry: "#228b22",
      };

      const bedTypeToPlantType: Record<string, PlantType> = {
        vegetable: "vegetable", flower: "flower", perennial: "herb", berry: "shrub",
      };

      const siteW = layout.site.dimensions.width;
      const siteL = layout.site.dimensions.length;
      const pathWidth = layout.paths.main_width_ft;

      const beds: GardenBed[] = layout.beds.map((bed) => {
        const centerX = bed.position.x + bed.dimensions.width / 2;
        const centerZ = bed.position.y + bed.dimensions.length / 2;
        const heightFt = (bed.dimensions.height || 12) / 12;

        const plants: Plant[] = [];
        const plantType = bedTypeToPlantType[bed.type] || "vegetable";

        bed.crops.forEach((crop, i) => {
          const baseCrop = Object.keys(cropColors).find(c => crop.toLowerCase().includes(c)) || crop;
          const color = cropColors[baseCrop] || "#228b22";
          const plantsPerCrop = Math.ceil(6 / bed.crops.length);

          for (let j = 0; j < plantsPerCrop; j++) {
            const angle = (j / plantsPerCrop) * Math.PI * 2 + i * 0.5;
            const radius = Math.min(bed.dimensions.width, bed.dimensions.length) * 0.25;
            plants.push({
              id: crypto.randomUUID(),
              name: crop.replace(/_/g, " "),
              type: plantType,
              position: {
                x: Math.cos(angle) * radius * (0.5 + Math.random() * 0.5),
                y: 0,
                z: Math.sin(angle) * radius * (0.5 + Math.random() * 0.5),
              },
              scale: 0.7 + Math.random() * 0.5,
              color,
            });
          }
        });

        return {
          id: bed.id,
          name: bed.name,
          position: { x: centerX, y: 0, z: centerZ },
          dimensions: { width: bed.dimensions.width, length: bed.dimensions.length, height: heightFt },
          frameMaterial: bed.material,
          soilColor: "#5c4033",
          plants,
        };
      });

      const paths: Garden["paths"] = [];
      const pathMaterialMap: Record<string, "gravel" | "stone" | "brick" | "wood"> = {
        wood_chips: "wood",
        gravel: "gravel",
        stone: "stone",
        brick: "brick",
        wood: "wood",
      };

      if (layout.explicit_paths && layout.explicit_paths.length > 0) {
        for (const p of layout.explicit_paths) {
          paths.push({
            id: p.id,
            points: p.points.map(pt => ({ x: pt.x, y: 0, z: pt.y })),
            width: p.width_ft,
            material: pathMaterialMap[p.material] || "gravel",
          });
        }
      } else {
        const rowYs = [...new Set(layout.beds.map(b => b.position.y))].sort((a, b) => a - b);
        const centerX = siteW / 2;

        paths.push({
          id: crypto.randomUUID(),
          points: [
            { x: centerX, y: 0, z: 2 },
            { x: centerX, y: 0, z: siteL - 2 },
          ],
          width: pathWidth,
          material: "gravel",
        });

        for (let i = 0; i < rowYs.length - 1; i++) {
          const rowY = rowYs[i]!;
          const bedsInRow = layout.beds.filter(b => b.position.y === rowY);
          const maxBedBottom = Math.max(...bedsInRow.map(b => b.position.y + b.dimensions.length));
          const nextRowY = rowYs[i + 1]!;
          const pathZ = (maxBedBottom + nextRowY) / 2;

          paths.push({
            id: crypto.randomUUID(),
            points: [
              { x: 2, y: 0, z: pathZ },
              { x: siteW - 2, y: 0, z: pathZ },
            ],
            width: pathWidth,
            material: "gravel",
          });
        }
      }

      let fence: Fence | undefined;
      const deerFence = layout.protection.deer;
      if (deerFence.type !== "none" && deerFence.position && deerFence.dimensions) {
        fence = {
          type: deerFence.type === "deer_mesh" ? "deer_mesh" : "wire",
          height: deerFence.height_ft,
          position: { x: deerFence.position.x, y: 0, z: deerFence.position.y },
          dimensions: {
            width: deerFence.dimensions.width,
            length: deerFence.dimensions.length,
          },
          gates: deerFence.gates.map(g => ({
            position: g.position,
            offset: g.offset_ft,
            width: g.width_ft,
          })),
        };
      }

      const groundColor = layout.ground_areas?.[0]?.color || "#4a7c23";

      let birdNetting: BirdNetting | undefined;
      const birdProtection = layout.protection.bird;
      if (birdProtection.type === "netting_full_garden" && fence) {
        const peakHeight = birdProtection.peak_height_ft || fence.height + 2;

        let supportPosts: BirdNetting["supportPosts"];
        if (birdProtection.support_posts && birdProtection.support_posts.length > 0) {
          supportPosts = birdProtection.support_posts.map(post => ({
            id: post.id,
            position: { x: post.position.x, y: 0, z: post.position.y },
            height: post.height_ft,
          }));
        } else {
          const gardenCenterX = siteW / 2;
          const gardenCenterZ = siteL / 2;

          let bestCornerX = siteW / 2;
          let bestCornerZ = siteL / 2;
          let bestDist = Infinity;

          for (const bed of layout.beds) {
            const corners = [
              { x: bed.position.x + 0.5, z: bed.position.y + 0.5 },
              { x: bed.position.x + bed.dimensions.width - 0.5, z: bed.position.y + 0.5 },
              { x: bed.position.x + 0.5, z: bed.position.y + bed.dimensions.length - 0.5 },
              { x: bed.position.x + bed.dimensions.width - 0.5, z: bed.position.y + bed.dimensions.length - 0.5 },
            ];

            for (const corner of corners) {
              const dist = Math.sqrt(
                (corner.x - gardenCenterX) ** 2 +
                (corner.z - gardenCenterZ) ** 2
              );
              if (dist < bestDist) {
                bestDist = dist;
                bestCornerX = corner.x;
                bestCornerZ = corner.z;
              }
            }
          }

          supportPosts = [
            {
              id: "auto-center",
              position: { x: bestCornerX, y: 0, z: bestCornerZ },
              height: peakHeight,
            },
          ];
        }

        birdNetting = {
          enabled: true,
          supportPosts,
          meshColor: birdProtection.mesh_color || "#222222",
          sagFactor: birdProtection.sag_factor ?? 0.15,
          fenceTopHeight: fence.height,
        };
      }

      const scatteredPlants: Garden["scatteredPlants"] = [];
      if (layout.scattered_plants?.enabled && layout.scattered_plants.plants) {
        const flowerColors: Record<string, string> = {
          zinnia: "#ff69b4",
          cosmos: "#dda0dd",
          sunflower: "#ffd700",
          marigold: "#ffa500",
          lavender: "#9370db",
          coneflower: "#c71585",
          blackeyedsusan: "#ffb347",
        };

        const isInsideBed = (x: number, z: number): boolean => {
          for (const bed of layout.beds) {
            const bedLeft = bed.position.x;
            const bedRight = bed.position.x + bed.dimensions.width;
            const bedTop = bed.position.y;
            const bedBottom = bed.position.y + bed.dimensions.length;
            const buffer = 0.5;
            if (x >= bedLeft - buffer && x <= bedRight + buffer &&
                z >= bedTop - buffer && z <= bedBottom + buffer) {
              return true;
            }
          }
          return false;
        };

        for (const plantConfig of layout.scattered_plants.plants) {
          const color = plantConfig.color || flowerColors[plantConfig.type.toLowerCase()] || "#ff69b4";
          const scaleMin = plantConfig.scale_range?.min ?? 0.6;
          const scaleMax = plantConfig.scale_range?.max ?? 1.2;

          const xMin = plantConfig.area?.x_min ?? 2;
          const xMax = plantConfig.area?.x_max ?? siteW - 2;
          const yMin = plantConfig.area?.y_min ?? 2;
          const yMax = plantConfig.area?.y_max ?? siteL - 2;

          let placed = 0;
          let attempts = 0;
          const maxAttempts = plantConfig.count * 20;

          while (placed < plantConfig.count && attempts < maxAttempts) {
            attempts++;
            const x = xMin + Math.random() * (xMax - xMin);
            const z = yMin + Math.random() * (yMax - yMin);

            if (plantConfig.avoid_beds !== false && isInsideBed(x, z)) {
              continue;
            }

            scatteredPlants.push({
              id: crypto.randomUUID(),
              name: plantConfig.type,
              type: "flower",
              position: { x, y: 0, z },
              scale: scaleMin + Math.random() * (scaleMax - scaleMin),
              color,
            });
            placed++;
          }
        }
      }

      setGarden({
        id: crypto.randomUUID(),
        name: layout.metadata.name,
        dimensions: { width: siteW, length: siteL },
        beds,
        paths,
        fence,
        birdNetting,
        groundColor,
        scatteredPlants,
      });

      setGardenInfo({
        name: layout.metadata.name,
        dimensions: { width: siteW, length: siteL },
        bedCount: beds.length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse layout");
      console.error("Layout parse error:", e);
      setGardenInfo(null);
    }
  }, [layoutData, setGardenInfo]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !garden) return;

    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    const gardenCenter = new THREE.Vector3(
      garden.dimensions.width / 2,
      0,
      garden.dimensions.length / 2
    );

    let renderer: GardenRenderer | null = null;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let mouseDownPosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      mouseDownPosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !renderer) return;
      const camera = renderer.getCamera();
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      if (e.shiftKey) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

        const distance = camera.position.distanceTo(gardenCenter);
        const panSpeed = distance * 0.002;

        gardenCenter.addScaledVector(right, deltaX * panSpeed);
        gardenCenter.addScaledVector(forward, deltaY * panSpeed);

        camera.position.addScaledVector(right, deltaX * panSpeed);
        camera.position.addScaledVector(forward, deltaY * panSpeed);
      } else {
        const offset = camera.position.clone().sub(gardenCenter);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.theta -= deltaX * 0.01;
        spherical.phi -= deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi));
        offset.setFromSpherical(spherical);
        camera.position.copy(gardenCenter).add(offset);
      }

      camera.lookAt(gardenCenter);
      previousMousePosition = { x: e.clientX, y: e.clientY };
      renderer.requestRender();
    };

    const onMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - mouseDownPosition.x;
      const dy = e.clientY - mouseDownPosition.y;
      const wasClick = Math.sqrt(dx * dx + dy * dy) < 5;

      if (wasClick && renderer && layoutRef.current) {
        const bedId = renderer.getBedAtPoint(e.clientX, e.clientY);
        if (bedId) {
          const bed = layoutRef.current.beds.find(b => b.id === bedId);
          setSelectedBed(bed || null);
        } else {
          setSelectedBed(null);
        }
      }

      isDragging = false;
    };
    const onMouseLeave = () => { isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      if (!renderer) return;
      e.preventDefault();
      const camera = renderer.getCamera();
      const offset = camera.position.clone().sub(gardenCenter);
      const distance = offset.length();
      const newDistance = distance * (1 + e.deltaY * 0.001);
      offset.setLength(Math.max(15, Math.min(120, newDistance)));
      camera.position.copy(gardenCenter).add(offset);
      renderer.requestRender();
    };

    const initRenderer = () => {
      if (renderer) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(initRenderer);
        return;
      }

      renderer = new GardenRenderer(container);
      renderer.renderGarden(garden);
      renderer.setSunTime(sunTime);
      rendererRef.current = renderer;
    };

    initRenderer();

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("wheel", onWheel);
      if (renderer) {
        renderer.dispose();
        rendererRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden]);

  // Update selection highlight when selectedBed changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.selectBed(selectedBed?.id || null);
    }
  }, [selectedBed]);

  // Update sun position when time changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSunTime(sunTime);
    }
  }, [sunTime]);

  if (loading) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f8fa",
        fontFamily: "system-ui, sans-serif",
        color: "#666",
      }}>
        Loading layout...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f8fa",
        color: "#cf222e",
        fontFamily: "system-ui, sans-serif",
        padding: 20,
      }}>
        <div>
          <strong>Layout Parse Error:</strong><br />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Simple controls hint */}
      <div style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        background: "rgba(0,0,0,0.6)",
        borderRadius: 4,
        padding: "6px 10px",
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        color: "#fff",
        zIndex: 10,
      }}>
        Drag to rotate · Shift+drag to pan · Scroll to zoom · Click bed to select
      </div>
    </div>
  );
}

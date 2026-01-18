import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import type { Garden, GardenBed, Plant, Path, Fence, BirdNetting } from "../schemas/garden";
import { FarmerCharacter } from "./FarmerCharacter";

export const SCALE = 1; // 1 unit = 1 foot
const TEXTURE_TILE_SIZE = 4; // Each texture tile covers 4ft x 4ft

// Simple 2D Perlin noise implementation
const perlinNoise = (() => {
  const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  const p = new Array(512);
  for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = p[X] + Y, B = p[X + 1] + Y;
    return lerp(v, lerp(u, grad(p[A], x, y), grad(p[B], x - 1, y)),
                   lerp(u, grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1)));
  };
})();

export class GardenRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gardenGroup: THREE.Group;
  private bedMeshes: Map<THREE.Object3D, string> = new Map();
  private bedGroups: Map<string, THREE.Group> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private selectedBedId: string | null = null;
  private hoveredBedId: string | null = null;
  private originalMaterials: Map<THREE.Object3D, THREE.Material> = new Map();
  private originalPositions: Map<string, number> = new Map(); // Store original Y positions for beds
  private glowClock: THREE.Clock = new THREE.Clock(); // For animated glow effect
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private textures: Map<string, THREE.Texture> = new Map();
  private needsRender = true;
  private animationFrameId: number | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private gardenCenter: THREE.Vector3 = new THREE.Vector3();
  private groundMaterials: THREE.ShaderMaterial[] = []; // Track materials that need sun color updates

  // Post-processing
  private composer: EffectComposer | null = null;
  private ssaoPass: SSAOPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  // Farmer character
  private farmer: FarmerCharacter | null = null;

  // Grid overlay
  private showGrid = false;
  private gridGroup: THREE.Group | null = null;
  private groundGroup: THREE.Group | null = null;
  private currentGarden: Garden | null = null;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Add fog for depth (extends to horizon)
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 400);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(45, 35, 45);
    this.camera.lookAt(0, 0, 0);

    // Improved renderer settings for better visual quality
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Up to 2x for quality
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

    // Tone mapping for better color range
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3; // Bright exposure
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    this.gardenGroup = new THREE.Group();
    this.scene.add(this.gardenGroup);

    this.setupLighting();
    this.setupPostProcessing(container);
    this.setupResizeHandler(container);
    this.loadTextures();
    this.animate();
  }

  private setupPostProcessing(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create effect composer
    this.composer = new EffectComposer(this.renderer);

    // Render pass (renders the scene)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // SSAO disabled - was making things too dark
    // this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
    // this.ssaoPass.kernelRadius = 8;
    // this.ssaoPass.minDistance = 0.001;
    // this.ssaoPass.maxDistance = 0.05;
    // this.ssaoPass.output = SSAOPass.OUTPUT.Default;
    // this.composer.addPass(this.ssaoPass);

    // Bloom pass for subtle glow on bright areas
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.08,  // strength - very subtle
      0.3,   // radius
      0.92   // threshold - only very bright areas bloom
    );
    this.composer.addPass(this.bloomPass);

    // SMAA antialiasing (additional smoothing on top of MSAA)
    const smaaPass = new SMAAPass();
    this.composer.addPass(smaaPass);

    // Output pass (applies tone mapping and color space conversion)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  private loadTextures(): void {
    const onTextureLoad = () => {
      this.needsRender = true;
    };

    // Load grass texture
    const grassTexture = this.textureLoader.load("/assets/grass.png", onTextureLoad);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.set("grass", grassTexture);

    // Load wood-chips texture
    const woodChipsTexture = this.textureLoader.load("/assets/wood-chips.png", onTextureLoad);
    woodChipsTexture.wrapS = THREE.RepeatWrapping;
    woodChipsTexture.wrapT = THREE.RepeatWrapping;
    woodChipsTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.set("wood-chips", woodChipsTexture);

    // Load dirt/soil texture
    const dirtTexture = this.textureLoader.load("/assets/dirt.png", onTextureLoad);
    dirtTexture.wrapS = THREE.RepeatWrapping;
    dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.set("dirt", dirtTexture);

    // Load moss texture for path patches
    const mossTexture = this.textureLoader.load("/assets/moss.png", onTextureLoad);
    mossTexture.wrapS = THREE.RepeatWrapping;
    mossTexture.wrapT = THREE.RepeatWrapping;
    mossTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.set("moss", mossTexture);

    // Load fence mesh texture (with alpha channel preserved)
    const fenceTexture = this.textureLoader.load("/assets/fence.png", onTextureLoad);
    fenceTexture.wrapS = THREE.RepeatWrapping;
    fenceTexture.wrapT = THREE.RepeatWrapping;
    fenceTexture.premultiplyAlpha = false;
    fenceTexture.generateMipmaps = true;
    fenceTexture.minFilter = THREE.LinearMipmapLinearFilter;
    fenceTexture.magFilter = THREE.LinearFilter;
    this.textures.set("fence", fenceTexture);
  }

  private getRepeatingTexture(name: string, widthFt: number, lengthFt: number): THREE.Texture | null {
    const texture = this.textures.get(name);
    if (!texture) return null;

    // Clone so each usage can have its own repeat settings
    const cloned = texture.clone();
    cloned.needsUpdate = true;
    cloned.repeat.set(widthFt / TEXTURE_TILE_SIZE, lengthFt / TEXTURE_TILE_SIZE);
    return cloned;
  }

  private setupLighting(): void {
    // Hemisphere light for natural sky/ground color - soft ambient fill
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
    this.scene.add(hemiLight);

    // Main sun light - softer for natural feel
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    this.sunLight.position.set(20, 30, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Fill light (opposite side, softer)
    const fillLight = new THREE.DirectionalLight(0x8ec8f2, 0.3);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  // Calculate solar position for Exeter, Rhode Island (41.5776°N, 71.5376°W)
  // Uses simplified solar position algorithm accurate for garden visualization
  private calculateSolarPosition(hour: number, dayOfYear: number = 172): { altitude: number; azimuth: number } {
    const latitude = 41.5776; // Exeter, RI latitude in degrees
    const latRad = latitude * Math.PI / 180;

    // Solar declination (angle of sun relative to equator)
    // Ranges from -23.44° (winter solstice) to +23.44° (summer solstice)
    // dayOfYear 172 = June 21 (summer solstice), 355 = Dec 21 (winter solstice)
    const declination = 23.44 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
    const declRad = declination * Math.PI / 180;

    // Hour angle: 0 at solar noon, negative in morning, positive in afternoon
    // Each hour = 15 degrees (360° / 24 hours)
    const solarNoon = 12; // Simplified - ignores longitude/timezone offset
    const hourAngle = (hour - solarNoon) * 15;
    const hourAngleRad = hourAngle * Math.PI / 180;

    // Solar altitude (elevation angle above horizon)
    const sinAltitude = Math.sin(latRad) * Math.sin(declRad) +
                        Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * 180 / Math.PI;

    // Solar azimuth (compass direction, 0° = North, 90° = East, 180° = South, 270° = West)
    const cosAzimuth = (Math.sin(declRad) - Math.sin(latRad) * sinAltitude) /
                       (Math.cos(latRad) * Math.cos(altitude * Math.PI / 180));
    let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * 180 / Math.PI;

    // Azimuth is measured from south in the formula, convert to compass bearing
    // Morning (hour < noon): azimuth is east of south
    // Afternoon (hour > noon): azimuth is west of south
    if (hour < solarNoon) {
      azimuth = 180 - azimuth; // East of south
    } else {
      azimuth = 180 + azimuth; // West of south
    }

    return { altitude, azimuth };
  }

  // Update sun position based on time of day (0-24 hours)
  // Optional dayOfYear parameter: 1-365 (default 172 = summer solstice June 21)
  setSunTime(hour: number, dayOfYear: number = 172): void {
    if (!this.sunLight) return;

    // Calculate accurate solar position for Exeter, RI
    const { altitude, azimuth } = this.calculateSolarPosition(hour, dayOfYear);

    // Convert altitude/azimuth to 3D position
    // In THREE.js: Y is up, we use X for east-west, Z for north-south
    // Azimuth: 0° = North (+Z), 90° = East (+X), 180° = South (-Z), 270° = West (-X)
    const radius = 50;
    const altRad = altitude * Math.PI / 180;
    const azimRad = azimuth * Math.PI / 180;

    // Horizontal distance from center (cos of altitude angle)
    const horizontalDist = Math.cos(altRad) * radius;
    // Height above ground (sin of altitude angle)
    const height = Math.sin(altRad) * radius;

    // Convert azimuth to X/Z coordinates
    // Azimuth 0° = North = +Z, 90° = East = +X, 180° = South = -Z, 270° = West = -X
    const x = Math.sin(azimRad) * horizontalDist;
    const z = Math.cos(azimRad) * horizontalDist;

    // Position sun relative to garden center
    // Only update if sun is above horizon (altitude > 0)
    if (altitude > 0) {
      this.sunLight.position.set(
        this.gardenCenter.x + x,
        Math.max(5, height),
        this.gardenCenter.z + z
      );
      this.sunLight.visible = true;
    } else {
      // Sun below horizon - keep minimal ambient
      this.sunLight.visible = false;
    }

    this.sunLight.target.position.copy(this.gardenCenter);
    this.sunLight.target.updateMatrixWorld(true);
    this.sunLight.updateMatrixWorld(true);
    this.sunLight.shadow.camera.updateMatrixWorld(true);
    this.sunLight.shadow.needsUpdate = true;

    // Adjust light color based on altitude (warmer at low angles = sunrise/sunset)
    let sunColor: THREE.Color;
    let intensity: number;
    if (altitude > 15) {
      // Midday - neutral warm white, soft intensity
      sunColor = new THREE.Color(0xfff5e6);
      intensity = 0.8;
    } else if (altitude > 5) {
      // Golden hour
      sunColor = new THREE.Color(0xffcc66);
      intensity = 0.65;
    } else if (altitude > 0) {
      // Sunrise/sunset - deep orange
      sunColor = new THREE.Color(0xff9944);
      intensity = 0.45;
    } else {
      // Night - dim blue moonlight
      sunColor = new THREE.Color(0x4466aa);
      intensity = 0.12;
    }

    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = intensity;

    // Update sky color based on sun altitude
    let skyColor: THREE.Color;
    if (altitude > 15) {
      skyColor = new THREE.Color(0x87ceeb); // Clear blue sky
    } else if (altitude > 5) {
      skyColor = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xffd4a3), 1 - altitude / 15); // Golden
    } else if (altitude > -5) {
      skyColor = new THREE.Color(0xffd4a3).lerp(new THREE.Color(0x2a1a4a), 1 - (altitude + 5) / 10); // Dusk/dawn
    } else {
      skyColor = new THREE.Color(0x0a0a1a); // Night
    }
    this.scene.background = skyColor;

    // Update ground materials with sun color for proper lighting
    for (const material of this.groundMaterials) {
      if (material.uniforms.sunLightColor) {
        material.uniforms.sunLightColor.value.copy(sunColor);
      }
      if (material.uniforms.sunIntensity) {
        material.uniforms.sunIntensity.value = intensity;
      }
      // Update mist color to match sky
      if (material.uniforms.mistColor) {
        material.uniforms.mistColor.value.copy(skyColor);
      }
    }

    // Update fog to match sky
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(skyColor);
    }

    this.requestRender();
  }

  private setupResizeHandler(container: HTMLElement): void {
    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);

      // Resize post-processing passes
      if (this.composer) {
        this.composer.setSize(width, height);
      }
      if (this.ssaoPass) {
        this.ssaoPass.setSize(width, height);
      }
      if (this.bloomPass) {
        this.bloomPass.setSize(width, height);
      }

      this.requestRender();
    });
    resizeObserver.observe(container);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Update farmer animation and movement
    if (this.farmer) {
      this.farmer.update();
      this.needsRender = true;
    }

    // Animate glow effect for hovered/selected beds
    if (this.hoveredBedId || this.selectedBedId) {
      this.updateGlowAnimation();
      this.needsRender = true;
    }

    if (this.needsRender) {
      // Use composer for post-processed rendering
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      this.needsRender = false;
    }
  };

  // Update glow intensity with pulsing animation
  private updateGlowAnimation(): void {
    const time = this.glowClock.getElapsedTime();

    // Pulse parameters
    const pulseSpeed = 1; // Cycles per second
    const pulseAmount = 0.3; // How much the glow varies (0-1)
    const pulse = Math.sin(time * pulseSpeed * Math.PI * 2) * 0.5 + 0.5; // 0 to 1

    // Update hovered bed glow
    if (this.hoveredBedId && this.hoveredBedId !== this.selectedBedId) {
      const group = this.bedGroups.get(this.hoveredBedId);
      if (group) {
        const baseIntensity = 0.4;
        const intensity = baseIntensity + pulse * pulseAmount;
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.emissiveIntensity = intensity;
          }
        });
      }
    }

    // Update selected bed glow (slower, more subtle pulse)
    if (this.selectedBedId) {
      const group = this.bedGroups.get(this.selectedBedId);
      if (group) {
        const slowPulse = Math.sin(time * 0.5 * Math.PI * 2) * 0.5 + 0.5;
        const baseIntensity = 0.5;
        const intensity = baseIntensity + slowPulse * 0.2;
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.emissiveIntensity = intensity;
          }
        });
      }
    }
  }

  // Request a re-render on next frame
  requestRender(): void {
    this.needsRender = true;
  }

  renderGarden(garden: Garden): void {
    this.gardenGroup.clear();
    this.bedMeshes.clear();
    this.bedGroups.clear();
    this.originalMaterials.clear();
    this.groundMaterials = []; // Clear tracked materials for sun color updates
    this.selectedBedId = null;
    this.pathIndex = 0;

    // Store garden reference for grid toggle
    this.currentGarden = garden;

    // Clean up grid and ground groups
    this.gridGroup?.clear();
    this.gridGroup = null;
    this.groundGroup = new THREE.Group();
    this.gardenGroup.add(this.groundGroup);

    // Clean up previous farmer
    this.farmer?.dispose();
    this.farmer = null;

    // Calculate garden center for camera positioning and sun tracking
    // Garden coordinates: (0,0) to (width, length)
    const centerX = garden.dimensions.width / 2;
    const centerZ = garden.dimensions.length / 2;
    this.gardenCenter.set(centerX, 0, centerZ);

    // Update shadow camera to cover garden
    if (this.sunLight) {
      const maxDim = Math.max(garden.dimensions.width, garden.dimensions.length);
      this.sunLight.shadow.camera.left = -maxDim;
      this.sunLight.shadow.camera.right = maxDim;
      this.sunLight.shadow.camera.top = maxDim;
      this.sunLight.shadow.camera.bottom = -maxDim;
      this.sunLight.shadow.camera.updateProjectionMatrix();
      this.sunLight.target.position.copy(this.gardenCenter);
      this.scene.add(this.sunLight.target);
      this.sunLight.target.updateMatrixWorld(true);
      this.sunLight.updateMatrixWorld(true);
      this.sunLight.shadow.camera.updateMatrixWorld(true);
      this.sunLight.shadow.needsUpdate = true;
    }

    // Update camera to look at garden center
    this.camera.position.set(centerX + 35, 35, centerZ + 35);
    this.camera.lookAt(centerX, 0, centerZ);

    // Ground plane with grass texture pattern
    this.renderGround(garden);

    // Fence border - use fence from garden data if available
    if (garden.fence) {
      this.renderFenceFromData(garden.fence);
    }

    // Bird netting over the garden
    if (garden.birdNetting?.enabled) {
      this.renderBirdNetting(garden.birdNetting, garden.dimensions);
    }

    // Render beds
    for (const bed of garden.beds) {
      this.renderBed(bed);
    }

    // Render paths
    for (const path of garden.paths) {
      this.renderPath(path);
    }

    // Render scattered plants (pollinator flowers, etc.)
    for (const plant of garden.scatteredPlants) {
      this.renderScatteredPlant(plant);
    }

    // Load the farmer character
    this.farmer = new FarmerCharacter(this.scene);
    this.farmer.load(garden);

    this.requestRender();
  }

  private renderScatteredPlant(plant: Garden["scatteredPlants"][number]): void {
    const group = new THREE.Group();

    // Use the same flower rendering as createFlower but positioned in world coords
    const scale = plant.scale;

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.4 * scale, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.2 * scale;
    group.add(stem);

    // Flower head
    const petalMaterial = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.6 });
    const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.5 });

    // Petals
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petalGeometry = new THREE.SphereGeometry(0.08 * scale, 6, 6);
      petalGeometry.scale(1, 0.3, 1);
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      petal.position.set(
        Math.cos(angle) * 0.1 * scale,
        0.45 * scale,
        Math.sin(angle) * 0.1 * scale
      );
      petal.castShadow = true;
      group.add(petal);
    }

    // Center
    const centerGeometry = new THREE.SphereGeometry(0.05 * scale, 8, 8);
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.45 * scale;
    group.add(center);

    // Position in world coordinates (y=0 is ground level)
    group.position.set(plant.position.x, 0, plant.position.z);
    this.gardenGroup.add(group);
  }

  private renderGround(garden: Garden): void {
    // Garden center coordinates
    const centerX = garden.dimensions.width / 2;
    const centerZ = garden.dimensions.length / 2;

    // Outer grass (extending to horizon) - circular for natural appearance
    const outerGrassRadius = 300;
    const outerGrassGeometry = new THREE.CircleGeometry(outerGrassRadius, 128);
    outerGrassGeometry.rotateX(-Math.PI / 2);

    // Add Perlin noise displacement to outer grass
    const outerPositions = outerGrassGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < outerPositions.count; i++) {
      const x = outerPositions.getX(i) + centerX;
      const z = outerPositions.getZ(i) + centerZ;
      const noise = perlinNoise(x * 0.05, z * 0.05);
      outerPositions.setY(i, outerPositions.getY(i) + noise * 0.15);
    }
    outerGrassGeometry.computeVertexNormals();

    const outerGrassTexture = this.textures.get("grass") || null;
    const outerGrassMaterial = this.createGrassMaterial(outerGrassTexture, 0x4a7a4a, 0x889988);
    const outerGrass = new THREE.Mesh(outerGrassGeometry, outerGrassMaterial);
    outerGrass.position.set(centerX, -0.20, centerZ);
    outerGrass.receiveShadow = true;
    this.groundGroup!.add(outerGrass);

    // Main garden ground (inside fence)
    const groundGeometry = new THREE.PlaneGeometry(
      garden.dimensions.width,
      garden.dimensions.length,
      48,
      48
    );
    groundGeometry.rotateX(-Math.PI / 2);

    // Add Perlin noise displacement for organic undulating look
    const positions = groundGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i) + centerX;
      const z = positions.getZ(i) + centerZ;
      const noise = perlinNoise(x * 0.15, z * 0.15);
      positions.setY(i, positions.getY(i) + noise * 0.08);
    }
    groundGeometry.computeVertexNormals();

    const innerGrassTexture = this.textures.get("grass") || null;
    const groundMaterial = this.createGrassMaterial(innerGrassTexture, 0x4a7a4a, 0x889988);
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(centerX, -0.12, centerZ);
    ground.receiveShadow = true;
    this.groundGroup!.add(ground);

    // Add atmospheric mist at terrain edges
    this.renderEdgeMist(centerX, centerZ, outerGrassRadius);
  }

  // Render atmospheric mist that fades in at terrain edges
  private renderEdgeMist(centerX: number, centerZ: number, terrainRadius: number): void {
    // Mist starts fading in at this distance from center
    const mistStartRadius = terrainRadius * 0.4;
    const mistEndRadius = terrainRadius;

    // Create a ring geometry for the mist
    const mistGeometry = new THREE.RingGeometry(mistStartRadius, mistEndRadius, 128, 8);
    mistGeometry.rotateX(-Math.PI / 2);

    // Custom shader for smooth radial mist gradient
    const mistMaterial = new THREE.ShaderMaterial({
      uniforms: {
        mistColor: { value: new THREE.Color(0x87ceeb) }, // Sky blue, updated with sky
        mistStartRadius: { value: mistStartRadius },
        mistEndRadius: { value: mistEndRadius },
        centerPos: { value: new THREE.Vector2(centerX, centerZ) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 mistColor;
        uniform float mistStartRadius;
        uniform float mistEndRadius;
        uniform vec2 centerPos;
        varying vec3 vWorldPos;

        void main() {
          // Distance from center
          float dist = length(vWorldPos.xz - centerPos);

          // Smooth gradient from transparent to opaque
          float t = smoothstep(mistStartRadius, mistEndRadius, dist);

          // Add some noise for organic look
          float noise = fract(sin(dot(vWorldPos.xz, vec2(12.9898, 78.233))) * 43758.5453);
          t = t * (0.85 + noise * 0.15);

          // Fade more aggressively at the very edge
          float edgeFade = smoothstep(mistEndRadius * 0.9, mistEndRadius, dist);
          float alpha = mix(t * 0.7, 1.0, edgeFade);

          gl_FragColor = vec4(mistColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Track for sky color updates
    this.groundMaterials.push(mistMaterial);

    const mist = new THREE.Mesh(mistGeometry, mistMaterial);
    mist.position.set(centerX, 0.5, centerZ); // Slightly above ground
    mist.renderOrder = 100; // Render after terrain
    this.groundGroup!.add(mist);

    // Add a second, higher mist layer for more atmosphere
    const upperMistGeometry = new THREE.RingGeometry(mistStartRadius * 1.2, mistEndRadius, 64, 4);
    upperMistGeometry.rotateX(-Math.PI / 2);

    const upperMistMaterial = new THREE.ShaderMaterial({
      uniforms: {
        mistColor: { value: new THREE.Color(0x87ceeb) },
        mistStartRadius: { value: mistStartRadius * 1.2 },
        mistEndRadius: { value: mistEndRadius },
        centerPos: { value: new THREE.Vector2(centerX, centerZ) },
      },
      vertexShader: mistMaterial.vertexShader,
      fragmentShader: `
        uniform vec3 mistColor;
        uniform float mistStartRadius;
        uniform float mistEndRadius;
        uniform vec2 centerPos;
        varying vec3 vWorldPos;

        void main() {
          float dist = length(vWorldPos.xz - centerPos);
          float t = smoothstep(mistStartRadius, mistEndRadius, dist);
          // Upper layer is more subtle
          float alpha = t * 0.4;
          gl_FragColor = vec4(mistColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.groundMaterials.push(upperMistMaterial);

    const upperMist = new THREE.Mesh(upperMistGeometry, upperMistMaterial);
    upperMist.position.set(centerX, 3.0, centerZ); // Higher layer
    upperMist.renderOrder = 101;
    this.groundGroup!.add(upperMist);
  }

  // Render fence from schema data with absolute positioning
  // Wood frame with black mesh design
  private renderFenceFromData(fence: Fence): void {
    const fenceHeight = fence.height;
    const postSpacing = 8; // 8ft spacing for sturdy wood frame
    const postSize = 0.33; // 4x4 posts (4 inches = 0.33 ft)
    const railHeight = 0.17; // 2x4 rail (2 inches high)
    const railWidth = 0.33; // 2x4 rail (4 inches wide)
    const x0 = fence.position.x;
    const z0 = fence.position.z;
    const w = fence.dimensions.width;
    const l = fence.dimensions.length;

    // Materials - Wood posts (pressure treated, slightly weathered look)
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b5344, // Natural wood brown
      roughness: 0.85,
      metalness: 0.0,
    });

    // Black deer mesh material with fence texture
    const fenceTexture = this.textures.get("fence");
    let meshMaterial: THREE.Material;
    if (fenceTexture) {
      meshMaterial = new THREE.ShaderMaterial({
        uniforms: {
          map: { value: fenceTexture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D map;
          varying vec2 vUv;
          void main() {
            vec2 scaledUv = vUv * 2.0; // Scale down the pattern
            vec4 texel = texture2D(map, scaledUv);
            float brightness = (texel.r + texel.g + texel.b) / 3.0;
            // Gray holes are brighter, mesh is darker
            if (brightness > 0.3) discard;
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black mesh
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      });
    } else {
      meshMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
    }

    // Define fence sides using absolute coordinates from schema
    const sides: Array<{ start: [number, number]; end: [number, number]; name: "north" | "south" | "east" | "west" }> = [
      { start: [x0, z0], end: [x0 + w, z0], name: "north" },
      { start: [x0 + w, z0], end: [x0 + w, z0 + l], name: "east" },
      { start: [x0 + w, z0 + l], end: [x0, z0 + l], name: "south" },
      { start: [x0, z0 + l], end: [x0, z0], name: "west" },
    ];

    // Find gates for each side
    const gatesMap = new Map<string, { offset: number; width: number }[]>();
    for (const gate of fence.gates) {
      if (!gatesMap.has(gate.position)) {
        gatesMap.set(gate.position, []);
      }
      gatesMap.get(gate.position)!.push({ offset: gate.offset, width: gate.width });
    }

    for (const side of sides) {
      const sx = side.start[0];
      const sz = side.start[1];
      const ex = side.end[0];
      const ez = side.end[1];
      const length = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2);
      const angle = Math.atan2(ex - sx, ez - sz);
      const sideGates = gatesMap.get(side.name) || [];

      // Calculate post positions
      const numPosts = Math.ceil(length / postSpacing) + 1;

      // Track post positions for mesh segments
      const postPositions: number[] = [];

      // Wood posts (4x4)
      for (let i = 0; i < numPosts; i++) {
        const t = i / (numPosts - 1);
        const x = sx + (ex - sx) * t;
        const z = sz + (ez - sz) * t;
        const distAlongSide = t * length;

        // Skip posts in gate areas (but mark gate post positions)
        let inGate = false;
        for (const gate of sideGates) {
          if (Math.abs(distAlongSide - gate.offset) < gate.width / 2 - 0.1) {
            inGate = true;
            break;
          }
        }

        if (!inGate) {
          postPositions.push(t);
          const postGeometry = new THREE.BoxGeometry(postSize, fenceHeight, postSize);
          const post = new THREE.Mesh(postGeometry, woodMaterial);
          post.position.set(x, fenceHeight / 2, z);
          post.castShadow = true;
          this.gardenGroup.add(post);
        }
      }

      // Handle gates with wood frame door
      if (sideGates.length > 0) {
        const sortedGates = [...sideGates].sort((a, b) => a.offset - b.offset);
        let currentStart = 0;

        for (const gate of sortedGates) {
          const gateStart = gate.offset - gate.width / 2;
          const gateEnd = gate.offset + gate.width / 2;

          // Mesh before gate
          if (gateStart > currentStart) {
            this.addFenceMeshSegment(sx, sz, ex, ez, currentStart / length, gateStart / length, fenceHeight, angle, meshMaterial);
          }

          // Gate posts (larger, matching wood style)
          const gatePostSize = postSize * 1.2;
          for (const gateT of [gateStart / length, gateEnd / length]) {
            const postGeometry = new THREE.BoxGeometry(gatePostSize, fenceHeight + 0.3, gatePostSize);
            const post = new THREE.Mesh(postGeometry, woodMaterial);
            post.position.set(
              sx + (ex - sx) * gateT,
              (fenceHeight + 0.3) / 2,
              sz + (ez - sz) * gateT
            );
            post.castShadow = true;
            this.gardenGroup.add(post);
          }

          // Render the gate door
          this.renderGateDoor(
            sx + (ex - sx) * (gateStart / length),
            sz + (ez - sz) * (gateStart / length),
            sx + (ex - sx) * (gateEnd / length),
            sz + (ez - sz) * (gateEnd / length),
            fenceHeight,
            angle,
            woodMaterial,
            meshMaterial
          );

          currentStart = gateEnd;
        }

        // Mesh after last gate
        if (currentStart < length) {
          this.addFenceMeshSegment(sx, sz, ex, ez, currentStart / length, 1, fenceHeight, angle, meshMaterial);
        }
      } else {
        // No gates - full mesh panel with proper UV tiling
        const meshGeometry = new THREE.PlaneGeometry(length, fenceHeight);
        // Scale UVs for tiling (assume texture is 4ft x 4ft)
        const uvAttr = meshGeometry.attributes.uv as THREE.BufferAttribute;
        for (let i = 0; i < uvAttr.count; i++) {
          uvAttr.setX(i, uvAttr.getX(i) * (length / 4));
          uvAttr.setY(i, uvAttr.getY(i) * (fenceHeight / 4));
        }
        const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
        mesh.position.set((sx + ex) / 2, fenceHeight / 2, (sz + ez) / 2);
        mesh.rotation.y = angle + Math.PI / 2;
        this.gardenGroup.add(mesh);
      }

      // Top rail (2x4 horizontal)
      const railGeometry = new THREE.BoxGeometry(railWidth, railHeight, length);
      const rail = new THREE.Mesh(railGeometry, woodMaterial);
      rail.position.set((sx + ex) / 2, fenceHeight + railHeight / 2, (sz + ez) / 2);
      rail.rotation.y = angle;
      rail.castShadow = true;
      this.gardenGroup.add(rail);
    }

    // Render baseboard if enabled (pressure-treated lumber along bottom)
    if (fence.baseboard?.enabled) {
      const baseboardHeight = fence.baseboard.height || 0.5; // Default 6 inches
      const baseboardThickness = fence.baseboard.thickness || 0.17; // 2x6 thickness

      // Pressure-treated wood has greenish tint
      const baseboardMaterial = new THREE.MeshStandardMaterial({
        color: 0x5a6b4a, // Greenish-brown for pressure treated
        roughness: 0.9,
        metalness: 0.0,
      });

      for (const side of sides) {
        const sx = side.start[0];
        const sz = side.start[1];
        const ex = side.end[0];
        const ez = side.end[1];
        const length = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2);
        const angle = Math.atan2(ex - sx, ez - sz);

        // Baseboard runs along bottom of fence
        const baseboardGeometry = new THREE.BoxGeometry(baseboardThickness, baseboardHeight, length);
        const baseboard = new THREE.Mesh(baseboardGeometry, baseboardMaterial);
        baseboard.position.set((sx + ex) / 2, baseboardHeight / 2, (sz + ez) / 2);
        baseboard.rotation.y = angle;
        baseboard.castShadow = true;
        baseboard.receiveShadow = true;
        this.gardenGroup.add(baseboard);
      }
    }
  }

  // Render a gate door with wood frame and mesh infill
  private renderGateDoor(
    startX: number, startZ: number,
    endX: number, endZ: number,
    height: number,
    angle: number,
    woodMaterial: THREE.Material,
    meshMaterial: THREE.Material
  ): void {
    const gateWidth = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);
    const centerX = (startX + endX) / 2;
    const centerZ = (startZ + endZ) / 2;
    const frameThickness = 0.17; // 2x4 frame
    const frameDepth = 0.08;

    // Gate frame group
    const gateGroup = new THREE.Group();

    // Top horizontal frame
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(gateWidth - 0.3, frameThickness, frameDepth),
      woodMaterial
    );
    topFrame.position.set(0, height - frameThickness / 2 - 0.1, 0);
    topFrame.castShadow = true;
    gateGroup.add(topFrame);

    // Bottom horizontal frame
    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(gateWidth - 0.3, frameThickness, frameDepth),
      woodMaterial
    );
    bottomFrame.position.set(0, frameThickness / 2 + 0.1, 0);
    bottomFrame.castShadow = true;
    gateGroup.add(bottomFrame);

    // Left vertical frame
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height - 0.4, frameDepth),
      woodMaterial
    );
    leftFrame.position.set(-(gateWidth - 0.3) / 2 + frameThickness / 2, height / 2, 0);
    leftFrame.castShadow = true;
    gateGroup.add(leftFrame);

    // Right vertical frame
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, height - 0.4, frameDepth),
      woodMaterial
    );
    rightFrame.position.set((gateWidth - 0.3) / 2 - frameThickness / 2, height / 2, 0);
    rightFrame.castShadow = true;
    gateGroup.add(rightFrame);

    // Diagonal brace (for structural look)
    const braceLength = Math.sqrt((gateWidth - 0.6) ** 2 + (height - 0.6) ** 2);
    const braceAngle = Math.atan2(height - 0.6, gateWidth - 0.6);
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(braceLength, frameThickness * 0.7, frameDepth * 0.7),
      woodMaterial
    );
    brace.position.set(0, height / 2, 0);
    brace.rotation.z = braceAngle;
    brace.castShadow = true;
    gateGroup.add(brace);

    // Mesh infill
    const meshInfill = new THREE.Mesh(
      new THREE.PlaneGeometry(gateWidth - 0.5, height - 0.5),
      meshMaterial
    );
    meshInfill.position.set(0, height / 2, -0.02);
    gateGroup.add(meshInfill);

    // Handle (simple cylinder)
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.6,
    });
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
      handleMaterial
    );
    handle.position.set((gateWidth - 0.3) / 2 - 0.3, height / 2, 0.08);
    handle.rotation.x = Math.PI / 2;
    gateGroup.add(handle);

    // Position and rotate the gate
    gateGroup.position.set(centerX, 0, centerZ);
    gateGroup.rotation.y = angle + Math.PI / 2;

    this.gardenGroup.add(gateGroup);
  }

  private addFenceMeshSegment(
    sx: number, sz: number, ex: number, ez: number,
    t1: number, t2: number,
    height: number, angle: number,
    material: THREE.Material
  ): void {
    const x1 = sx + (ex - sx) * t1;
    const z1 = sz + (ez - sz) * t1;
    const x2 = sx + (ex - sx) * t2;
    const z2 = sz + (ez - sz) * t2;
    const segLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);

    const meshGeometry = new THREE.PlaneGeometry(segLen, height);
    // Scale UVs for tiling (assume texture is 4ft x 4ft)
    const uvAttr = meshGeometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setX(i, uvAttr.getX(i) * (segLen / 4));
      uvAttr.setY(i, uvAttr.getY(i) * (height / 4));
    }
    const mesh = new THREE.Mesh(meshGeometry, material);
    mesh.position.set((x1 + x2) / 2, height / 2, (z1 + z2) / 2);
    mesh.rotation.y = angle + Math.PI / 2;
    this.gardenGroup.add(mesh);
  }

  // Render bird netting over the entire garden (ridge-tent style)
  private renderBirdNetting(
    birdNetting: BirdNetting,
    dimensions: { width: number; length: number }
  ): void {
    const fenceHeight = birdNetting.fenceTopHeight;
    const sagFactor = birdNetting.sagFactor;
    const w = dimensions.width;
    const l = dimensions.length;

    // Wood material for support posts
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b5344,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Cable material
    const cableMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
    });

    // Bird netting material - semi-transparent mesh
    const nettingMaterial = new THREE.MeshStandardMaterial({
      color: birdNetting.meshColor,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });

    // Render support posts
    const posts = birdNetting.supportPosts;
    for (const post of posts) {
      const postSize = 0.33;
      const postGeometry = new THREE.BoxGeometry(postSize, post.height, postSize);
      const postMesh = new THREE.Mesh(postGeometry, woodMaterial);
      postMesh.position.set(post.position.x, post.height / 2, post.position.z);
      postMesh.castShadow = true;
      this.gardenGroup.add(postMesh);

      // Decorative cap
      const capGeometry = new THREE.ConeGeometry(0.25, 0.3, 4);
      const cap = new THREE.Mesh(capGeometry, woodMaterial);
      cap.position.set(post.position.x, post.height + 0.15, post.position.z);
      cap.rotation.y = Math.PI / 4;
      this.gardenGroup.add(cap);
    }

    // Build cable network for structure
    const cables: Array<{ x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }> = [];

    // Ridge cable between posts (if multiple posts)
    if (posts.length >= 2) {
      for (let i = 0; i < posts.length - 1; i++) {
        const p1 = posts[i]!;
        const p2 = posts[i + 1]!;
        cables.push({
          x1: p1.position.x, y1: p1.height, z1: p1.position.z,
          x2: p2.position.x, y2: p2.height, z2: p2.position.z,
        });
        this.addSaggingCable(
          p1.position.x, p1.height, p1.position.z,
          p2.position.x, p2.height, p2.position.z,
          sagFactor * 0.2, cableMaterial
        );
      }
    }

    // Cables from posts to fence corners and midpoints
    const fenceAnchors = [
      { x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: l }, { x: 0, z: l }, // corners
      { x: w / 2, z: 0 }, { x: w, z: l / 2 }, { x: w / 2, z: l }, { x: 0, z: l / 2 }, // midpoints
    ];

    for (const post of posts) {
      for (const anchor of fenceAnchors) {
        cables.push({
          x1: post.position.x, y1: post.height, z1: post.position.z,
          x2: anchor.x, y2: fenceHeight, z2: anchor.z,
        });
        this.addSaggingCable(
          post.position.x, post.height, post.position.z,
          anchor.x, fenceHeight, anchor.z,
          sagFactor * 0.4, cableMaterial
        );
      }
    }

    // Perimeter cables along fence top
    const perimeterPoints = [
      { x: 0, z: 0 }, { x: w / 2, z: 0 }, { x: w, z: 0 },
      { x: w, z: l / 2 }, { x: w, z: l },
      { x: w / 2, z: l }, { x: 0, z: l },
      { x: 0, z: l / 2 }, { x: 0, z: 0 },
    ];
    for (let i = 0; i < perimeterPoints.length - 1; i++) {
      const p1 = perimeterPoints[i]!;
      const p2 = perimeterPoints[i + 1]!;
      this.addSaggingCable(
        p1.x, fenceHeight, p1.z,
        p2.x, fenceHeight, p2.z,
        sagFactor * 0.15, cableMaterial
      );
    }

    // Create the mesh surface
    this.renderRidgeTentMesh(dimensions, posts, fenceHeight, sagFactor, nettingMaterial);
  }

  // Create ridge-tent style mesh that follows cable structure
  private renderRidgeTentMesh(
    dimensions: { width: number; length: number },
    posts: BirdNetting["supportPosts"],
    fenceHeight: number,
    sagFactor: number,
    material: THREE.Material
  ): void {
    const w = dimensions.width;
    const l = dimensions.length;
    const segmentsX = Math.ceil(w * 3);
    const segmentsZ = Math.ceil(l * 3);

    const geometry = new THREE.PlaneGeometry(w, l, segmentsX, segmentsZ);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(w / 2, 0, l / 2);

    const positions = geometry.attributes.position as THREE.BufferAttribute;

    // For ridge-tent: height depends on position relative to ridge line and edges
    // Ridge runs along Z at the average X of posts
    const ridgeX = posts.length > 0
      ? posts.reduce((sum, p) => sum + p.position.x, 0) / posts.length
      : w / 2;
    const ridgeZ = posts.length > 0
      ? posts.reduce((sum, p) => sum + p.position.z, 0) / posts.length
      : l / 2;
    const peakHeight = posts.length > 0
      ? Math.max(...posts.map(p => p.height))
      : fenceHeight + 2;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Calculate base height using tent geometry
      // Height decreases linearly from ridge to fence edges

      // Distance to nearest edge (fence)
      const distToLeft = x;
      const distToRight = w - x;
      const distToTop = z;
      const distToBottom = l - z;
      const minDistToEdge = Math.min(distToLeft, distToRight, distToTop, distToBottom);

      // Distance to ridge line (for ridge-tent, ridge runs through posts)
      let distToRidge: number;
      if (posts.length >= 2) {
        // Ridge line between first and last post
        const p1 = posts[0]!;
        const p2 = posts[posts.length - 1]!;
        // Point-to-line distance
        const dx = p2.position.x - p1.position.x;
        const dz = p2.position.z - p1.position.z;
        const lineLen = Math.sqrt(dx * dx + dz * dz);
        if (lineLen > 0) {
          const t = Math.max(0, Math.min(1,
            ((x - p1.position.x) * dx + (z - p1.position.z) * dz) / (lineLen * lineLen)
          ));
          const closestX = p1.position.x + t * dx;
          const closestZ = p1.position.z + t * dz;
          distToRidge = Math.sqrt((x - closestX) ** 2 + (z - closestZ) ** 2);
        } else {
          distToRidge = Math.sqrt((x - ridgeX) ** 2 + (z - ridgeZ) ** 2);
        }
      } else {
        distToRidge = Math.sqrt((x - ridgeX) ** 2 + (z - ridgeZ) ** 2);
      }

      // Max possible distance to ridge (from corners)
      const maxRidgeDist = Math.max(
        Math.sqrt(ridgeX ** 2 + ridgeZ ** 2),
        Math.sqrt((w - ridgeX) ** 2 + ridgeZ ** 2),
        Math.sqrt(ridgeX ** 2 + (l - ridgeZ) ** 2),
        Math.sqrt((w - ridgeX) ** 2 + (l - ridgeZ) ** 2)
      );

      // Tent slope: height interpolates from peak at ridge to fence height at edges
      const ridgeRatio = Math.min(distToRidge / maxRidgeDist, 1);
      const baseHeight = peakHeight - (peakHeight - fenceHeight) * ridgeRatio;

      // Apply catenary sag based on distance from nearest support cable
      // More sag in the middle of panels, less near cables
      const panelCenter = Math.min(distToRidge, minDistToEdge);
      const maxPanelDist = Math.min(maxRidgeDist / 2, Math.min(w, l) / 2);
      const sagRatio = Math.min(panelCenter / maxPanelDist, 1);

      // Parabolic sag profile
      const sagDepth = sagFactor * maxPanelDist * sagRatio * (1 - sagRatio * 0.3);
      const height = baseHeight - sagDepth;

      positions.setY(i, height);
    }

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    this.gardenGroup.add(mesh);
  }

  // Create a cable/rope that sags between two points
  private addSaggingCable(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    sagAmount: number,
    material: THREE.Material
  ): void {
    const segments = 16;
    const points: THREE.Vector3[] = [];
    const span = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const baseY = y1 + (y2 - y1) * t;

      // Catenary sag (parabolic approximation)
      const sag = sagAmount * span * 4 * t * (1 - t);
      points.push(new THREE.Vector3(x, baseY - sag, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.015, 6, false);
    const cable = new THREE.Mesh(tubeGeometry, material);
    this.gardenGroup.add(cable);
  }

  private renderBed(bed: GardenBed): void {
    const isMetalBed = bed.frameMaterial === "galvanized_metal";
    const boardThickness = isMetalBed ? 0.05 : 0.15;

    // Create a group for this bed to enable click detection
    const bedGroup = new THREE.Group();
    bedGroup.userData.bedId = bed.id;

    // Soil with bulging top surface
    const soilWidth = bed.dimensions.width - boardThickness * 2;
    const soilLength = bed.dimensions.length - boardThickness * 2;
    const soilHeight = bed.dimensions.height - 0.05;
    const dirtTexture = this.getRepeatingTexture("dirt", soilWidth, soilLength);
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: dirtTexture ? 0xffffff : 0xb8956b, // White multiplier to show texture as-is
      roughness: 0.85,
      map: dirtTexture || undefined,
    });

    // Base box for soil sides (slightly shorter to make room for bulging top)
    const bulgeHeight = 0.15;
    const baseGeometry = new THREE.BoxGeometry(soilWidth, soilHeight - bulgeHeight, soilLength);
    const soilBase = new THREE.Mesh(baseGeometry, soilMaterial);
    soilBase.position.set(
      bed.position.x,
      bed.position.y + (soilHeight - bulgeHeight) / 2,
      bed.position.z
    );
    soilBase.castShadow = true;
    soilBase.receiveShadow = true;
    bedGroup.add(soilBase);
    this.bedMeshes.set(soilBase, bed.id);

    // Bulging top surface with Perlin noise displacement
    const segments = Math.max(16, Math.floor(Math.max(soilWidth, soilLength) * 4));
    const topGeometry = new THREE.PlaneGeometry(soilWidth, soilLength, segments, segments);
    topGeometry.rotateX(-Math.PI / 2);

    const positions = topGeometry.attributes.position as THREE.BufferAttribute;
    const noiseScale = 0.8;
    const noiseStrength = 0.25; // ~3 inches of noise variation
    const centerBulge = 0.4; // ~5 inches of center bulge

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Normalized distance from center (0 at center, 1 at edges)
      const nx = (x / (soilWidth / 2));
      const nz = (z / (soilLength / 2));
      const distFromCenter = Math.sqrt(nx * nx + nz * nz);

      // Smooth falloff from center bulge (1 at center, 0 at edges)
      const bulgeFactor = Math.max(0, 1 - distFromCenter * distFromCenter);

      // Perlin noise for natural variation
      const noise = perlinNoise(
        (x + bed.position.x) * noiseScale,
        (z + bed.position.z) * noiseScale
      );

      // Combine bulge and noise, with noise reduced at edges
      const displacement = bulgeFactor * centerBulge + noise * noiseStrength * (0.3 + 0.7 * bulgeFactor);
      positions.setY(i, displacement);
    }

    topGeometry.computeVertexNormals();

    const soilTop = new THREE.Mesh(topGeometry, soilMaterial);
    soilTop.position.set(
      bed.position.x,
      bed.position.y + soilHeight - bulgeHeight,
      bed.position.z
    );
    soilTop.castShadow = true;
    soilTop.receiveShadow = true;
    bedGroup.add(soilTop);
    this.bedMeshes.set(soilTop, bed.id);

    if (isMetalBed) {
      // Galvanized metal bed - corrugated appearance
      this.renderMetalBedFrame(bed, bedGroup, boardThickness);
    } else {
      // Wood frame bed
      this.renderWoodBedFrame(bed, bedGroup, boardThickness);
    }

    // Add bed group to garden and track it
    this.gardenGroup.add(bedGroup);
    this.bedGroups.set(bed.id, bedGroup);
    this.originalPositions.set(bed.id, bedGroup.position.y);

    for (const plant of bed.plants) {
      this.renderPlant(plant, bed);
    }
  }

  private renderWoodBedFrame(bed: GardenBed, bedGroup: THREE.Group, boardThickness: number): void {
    const woodColor = bed.frameMaterial === "cedar" ? 0x8b5a2b :
                      bed.frameMaterial === "pine" ? 0xdeb887 : 0x6b4423;

    const boardMaterial = new THREE.MeshStandardMaterial({
      color: woodColor,
      roughness: 0.7,
    });

    // Front and back boards
    for (const zOffset of [-1, 1]) {
      const boardGeometry = new THREE.BoxGeometry(
        bed.dimensions.width,
        bed.dimensions.height,
        boardThickness
      );
      const board = new THREE.Mesh(boardGeometry, boardMaterial);
      board.position.set(
        bed.position.x,
        bed.position.y + bed.dimensions.height / 2,
        bed.position.z + (zOffset * (bed.dimensions.length - boardThickness)) / 2
      );
      board.castShadow = true;
      board.receiveShadow = true;
      bedGroup.add(board);
      this.bedMeshes.set(board, bed.id);
    }

    // Left and right boards
    for (const xOffset of [-1, 1]) {
      const boardGeometry = new THREE.BoxGeometry(
        boardThickness,
        bed.dimensions.height,
        bed.dimensions.length - boardThickness * 2
      );
      const board = new THREE.Mesh(boardGeometry, boardMaterial);
      board.position.set(
        bed.position.x + (xOffset * (bed.dimensions.width - boardThickness)) / 2,
        bed.position.y + bed.dimensions.height / 2,
        bed.position.z
      );
      board.castShadow = true;
      board.receiveShadow = true;
      bedGroup.add(board);
      this.bedMeshes.set(board, bed.id);
    }

    // Corner posts
    for (const xOffset of [-1, 1]) {
      for (const zOffset of [-1, 1]) {
        const postGeometry = new THREE.BoxGeometry(0.2, bed.dimensions.height + 0.1, 0.2);
        const post = new THREE.Mesh(postGeometry, boardMaterial);
        post.position.set(
          bed.position.x + (xOffset * (bed.dimensions.width - 0.2)) / 2,
          bed.position.y + (bed.dimensions.height + 0.1) / 2,
          bed.position.z + (zOffset * (bed.dimensions.length - 0.2)) / 2
        );
        post.castShadow = true;
        bedGroup.add(post);
        this.bedMeshes.set(post, bed.id);
      }
    }
  }

  private renderMetalBedFrame(bed: GardenBed, bedGroup: THREE.Group, boardThickness: number): void {
    // Galvanized metal material - bright silver
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d8d8, // Very bright silver
      roughness: 0.4,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });

    // Top rim material - slightly darker than main panels
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c0c0,
      roughness: 0.3,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });

    // Create corrugated panels for each side
    const corrugationDepth = 0.03;
    const corrugationWavelength = 0.15;

    // Front and back panels (along X axis)
    for (const zOffset of [-1, 1]) {
      const panel = this.createCorrugatedPanel(
        bed.dimensions.width,
        bed.dimensions.height,
        corrugationDepth,
        corrugationWavelength,
        metalMaterial,
        "horizontal"
      );
      panel.position.set(
        bed.position.x,
        bed.position.y + bed.dimensions.height / 2,
        bed.position.z + (zOffset * (bed.dimensions.length - boardThickness)) / 2
      );
      if (zOffset === 1) panel.rotation.y = Math.PI;
      panel.castShadow = true;
      panel.receiveShadow = true;
      bedGroup.add(panel);
      this.bedMeshes.set(panel, bed.id);
    }

    // Left and right panels (along Z axis)
    for (const xOffset of [-1, 1]) {
      const panel = this.createCorrugatedPanel(
        bed.dimensions.length - boardThickness * 2,
        bed.dimensions.height,
        corrugationDepth,
        corrugationWavelength,
        metalMaterial,
        "horizontal"
      );
      panel.position.set(
        bed.position.x + (xOffset * (bed.dimensions.width - boardThickness)) / 2,
        bed.position.y + bed.dimensions.height / 2,
        bed.position.z
      );
      panel.rotation.y = Math.PI / 2 * (xOffset === 1 ? 1 : -1);
      panel.castShadow = true;
      panel.receiveShadow = true;
      bedGroup.add(panel);
      this.bedMeshes.set(panel, bed.id);
    }

    // Top rim (rolled edge typical of metal beds)
    const rimHeight = 0.04;
    const rimWidth = 0.06;

    // Create rim around the top edge
    for (const side of ["front", "back", "left", "right"] as const) {
      let rimLength: number;
      let rimX: number;
      let rimZ: number;
      let rimRotation = 0;

      if (side === "front" || side === "back") {
        rimLength = bed.dimensions.width + rimWidth;
        rimX = bed.position.x;
        rimZ = bed.position.z + (side === "front" ? -1 : 1) * (bed.dimensions.length / 2);
      } else {
        rimLength = bed.dimensions.length;
        rimX = bed.position.x + (side === "left" ? -1 : 1) * (bed.dimensions.width / 2);
        rimZ = bed.position.z;
        rimRotation = Math.PI / 2;
      }

      const rimGeometry = new THREE.BoxGeometry(rimLength, rimHeight, rimWidth);
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.set(rimX, bed.position.y + bed.dimensions.height + rimHeight / 2, rimZ);
      rim.rotation.y = rimRotation;
      rim.castShadow = true;
      bedGroup.add(rim);
      this.bedMeshes.set(rim, bed.id);
    }
  }

  private createCorrugatedPanel(
    width: number,
    height: number,
    depth: number,
    wavelength: number,
    material: THREE.Material,
    _direction: "horizontal" | "vertical"
  ): THREE.Mesh {
    // Create a corrugated geometry by modifying vertices of a plane
    const segments = Math.max(2, Math.floor(width / wavelength) * 2);
    const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
    const positions = geometry.attributes.position as THREE.BufferAttribute;

    // Modify Z positions to create corrugation
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      // Sine wave for corrugation
      const corrugation = Math.sin((x / width + 0.5) * segments * Math.PI) * depth;
      positions.setZ(i, corrugation);
    }

    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  }

  private renderPlant(plant: Plant, bed: GardenBed): void {
    const plantGroup = new THREE.Group();

    switch (plant.type) {
      case "tree":
        this.createTree(plantGroup, plant);
        break;
      case "shrub":
        this.createShrub(plantGroup, plant);
        break;
      case "flower":
        this.createFlower(plantGroup, plant);
        break;
      case "vegetable":
        this.createVegetable(plantGroup, plant);
        break;
      case "herb":
        this.createHerb(plantGroup, plant);
        break;
      default:
        this.createGenericPlant(plantGroup, plant);
    }

    plantGroup.position.set(
      bed.position.x + plant.position.x,
      bed.position.y + bed.dimensions.height,
      bed.position.z + plant.position.z
    );

    this.gardenGroup.add(plantGroup);
  }

  private createTree(group: THREE.Group, plant: Plant): void {
    const scale = plant.scale;

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 1 * scale, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.5 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const radius = (0.6 - i * 0.15) * scale;
      const foliageGeometry = new THREE.ConeGeometry(radius, 0.8 * scale, 8);
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = (1 + i * 0.5) * scale;
      foliage.castShadow = true;
      group.add(foliage);
    }
  }

  private createShrub(group: THREE.Group, plant: Plant): void {
    const scale = plant.scale;
    const material = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.8 });

    // Multiple spheres for bushy look
    for (let i = 0; i < 5; i++) {
      const radius = (0.2 + Math.random() * 0.15) * scale;
      const geometry = new THREE.SphereGeometry(radius, 8, 8);
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(
        (Math.random() - 0.5) * 0.3 * scale,
        radius + Math.random() * 0.2 * scale,
        (Math.random() - 0.5) * 0.3 * scale
      );
      sphere.castShadow = true;
      group.add(sphere);
    }
  }

  private createFlower(group: THREE.Group, plant: Plant): void {
    const scale = plant.scale;

    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.4 * scale, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.2 * scale;
    group.add(stem);

    // Flower head
    const petalMaterial = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.6 });
    const centerMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.5 });

    // Petals
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petalGeometry = new THREE.SphereGeometry(0.08 * scale, 6, 6);
      petalGeometry.scale(1, 0.3, 1);
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      petal.position.set(
        Math.cos(angle) * 0.1 * scale,
        0.45 * scale,
        Math.sin(angle) * 0.1 * scale
      );
      petal.castShadow = true;
      group.add(petal);
    }

    // Center
    const centerGeometry = new THREE.SphereGeometry(0.05 * scale, 8, 8);
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.45 * scale;
    group.add(center);
  }

  private createVegetable(group: THREE.Group, plant: Plant): void {
    const scale = plant.scale;
    const leafMaterial = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.8 });

    // Bushy leaves
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const leafGeometry = new THREE.SphereGeometry(0.15 * scale, 6, 6);
      leafGeometry.scale(1, 0.5, 0.7);
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.set(
        Math.cos(angle) * 0.1 * scale,
        0.15 * scale,
        Math.sin(angle) * 0.1 * scale
      );
      leaf.rotation.y = angle;
      leaf.rotation.z = 0.3;
      leaf.castShadow = true;
      group.add(leaf);
    }

    // Center growth
    const centerGeometry = new THREE.SphereGeometry(0.1 * scale, 8, 8);
    const center = new THREE.Mesh(centerGeometry, leafMaterial);
    center.position.y = 0.2 * scale;
    center.castShadow = true;
    group.add(center);
  }

  private createHerb(group: THREE.Group, plant: Plant): void {
    const scale = plant.scale;
    const material = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.8 });

    // Multiple thin upright leaves
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const height = (0.2 + Math.random() * 0.15) * scale;
      const leafGeometry = new THREE.ConeGeometry(0.02 * scale, height, 4);
      const leaf = new THREE.Mesh(leafGeometry, material);
      leaf.position.set(
        Math.cos(angle) * 0.05 * scale,
        height / 2,
        Math.sin(angle) * 0.05 * scale
      );
      leaf.rotation.x = (Math.random() - 0.5) * 0.3;
      leaf.rotation.z = (Math.random() - 0.5) * 0.3;
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  private createGenericPlant(group: THREE.Group, plant: Plant): void {
    const scale = plant.scale;
    const geometry = new THREE.SphereGeometry(0.2 * scale, 8, 8);
    const material = new THREE.MeshStandardMaterial({ color: plant.color, roughness: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.2 * scale;
    mesh.castShadow = true;
    group.add(mesh);
  }

  private pathIndex = 0;

  // Grass uses THREE UV offsets for maximum variation since it covers large areas
  // Includes sunLightColor uniform for time-of-day lighting
  private createGrassMaterial(texture: THREE.Texture | null, fallbackColor: number, tintColor?: number): THREE.ShaderMaterial | THREE.MeshStandardMaterial {
    if (!texture) {
      return new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.95 });
    }

    const tint = new THREE.Color(tintColor ?? 0xffffff);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        textureTileSize: { value: TEXTURE_TILE_SIZE },
        uvOffset2: { value: new THREE.Vector2(0.41, 0.67) },
        uvOffset3: { value: new THREE.Vector2(0.23, 0.31) },
        noiseScale: { value: 0.25 },
        tint: { value: tint },
        sunLightColor: { value: new THREE.Color(0xfff5e6) }, // Warm white default
        sunIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float textureTileSize;
        uniform vec2 uvOffset2;
        uniform vec2 uvOffset3;
        uniform float noiseScale;
        uniform vec3 tint;
        uniform vec3 sunLightColor;
        uniform float sunIntensity;
        varying vec3 vWorldPos;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 worldUV = vWorldPos.xz / textureTileSize;

          // Sample texture at three different UV offsets
          vec4 color1 = texture2D(map, worldUV);
          vec4 color2 = texture2D(map, worldUV + uvOffset2);
          vec4 color3 = texture2D(map, worldUV + uvOffset3);

          // Two noise layers at different scales for organic blending
          float noise1 = snoise(vWorldPos.xz * noiseScale) * 0.5 + 0.5;
          float noise2 = snoise(vWorldPos.xz * noiseScale * 2.3 + 100.0) * 0.5 + 0.5;

          // Blend all three: first two, then mix in third
          vec4 blend12 = mix(color1, color2, noise1);
          vec4 finalColor = mix(blend12, color3, noise2 * 0.5);

          // Apply tint and sun light color
          finalColor.rgb *= tint;
          finalColor.rgb *= sunLightColor * sunIntensity;
          gl_FragColor = finalColor;
        }
      `,
    });

    // Track this material for sun color updates
    this.groundMaterials.push(material);
    return material;
  }

  private createMulchMaterial(texture: THREE.Texture | null, fallbackColor: number, mossTexture?: THREE.Texture | null): THREE.ShaderMaterial | THREE.MeshStandardMaterial {
    if (!texture) {
      return new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.95 });
    }

    // Custom shader with parallax occlusion mapping for per-pixel depth
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        mossMap: { value: mossTexture || null },
        hasMoss: { value: mossTexture ? 1.0 : 0.0 },
        textureTileSize: { value: TEXTURE_TILE_SIZE },
        uvOffset2: { value: new THREE.Vector2(0.37, 0.53) },
        noiseScale: { value: 0.5 },
        parallaxScale: { value: 0.004 }, // Depth scale for parallax
        parallaxSteps: { value: 32.0 }, // Ray march steps
        tint: { value: new THREE.Color(0x887766) }, // Darken paths
        sunLightColor: { value: new THREE.Color(0xfff5e6) }, // Warm white default
        sunIntensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec3 vNormal;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);

          // View direction in world space
          vViewDir = normalize(cameraPosition - worldPos.xyz);

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform sampler2D mossMap;
        uniform float hasMoss;
        uniform float textureTileSize;
        uniform vec2 uvOffset2;
        uniform float noiseScale;
        uniform float parallaxScale;
        uniform float parallaxSteps;
        uniform vec3 tint;
        uniform vec3 sunLightColor;
        uniform float sunIntensity;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying vec3 vNormal;

        // Simplex noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Sample height with box blur for smooth gradients
        float getHeight(vec2 uv) {
          vec2 texelSize = vec2(0.003);
          float h = 0.0;
          h += dot(texture2D(map, uv).rgb, vec3(0.299, 0.587, 0.114)) * 0.4;
          h += dot(texture2D(map, uv + vec2(texelSize.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15;
          h += dot(texture2D(map, uv - vec2(texelSize.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15;
          h += dot(texture2D(map, uv + vec2(0.0, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15;
          h += dot(texture2D(map, uv - vec2(0.0, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114)) * 0.15;
          return smoothstep(0.2, 0.8, h);
        }

        // Parallax with binary search refinement
        vec2 parallaxMapping(vec2 uv, vec3 viewDir) {
          float viewAngle = max(viewDir.y, 0.3);
          vec2 uvOffset = viewDir.xz * parallaxScale / viewAngle;
          float stepSize = 1.0 / parallaxSteps;
          float currentLayerDepth = 0.0;
          vec2 currentUV = uv;
          float currentTexHeight = getHeight(currentUV);
          vec2 prevUV = uv;
          float prevLayerDepth = 0.0;

          // Linear search
          for (float i = 0.0; i < 32.0; i++) {
            if (currentLayerDepth >= currentTexHeight) break;
            prevUV = currentUV;
            prevLayerDepth = currentLayerDepth;
            currentLayerDepth += stepSize;
            currentUV = uv - uvOffset * currentLayerDepth;
            currentTexHeight = getHeight(currentUV);
          }

          // Binary search refinement
          float d0 = prevLayerDepth;
          float d1 = currentLayerDepth;
          vec2 p0 = prevUV;
          vec2 p1 = currentUV;
          for (float j = 0.0; j < 6.0; j++) {
            float midD = (d0 + d1) * 0.5;
            vec2 midUV = uv - uvOffset * midD;
            float midH = getHeight(midUV);
            if (midD < midH) { d0 = midD; p0 = midUV; }
            else { d1 = midD; p1 = midUV; }
          }

          // Smooth final interpolation
          float h0 = getHeight(p0);
          float h1 = getHeight(p1);
          float t = clamp((d0 - h0) / ((d0 - h0) + (h1 - d1) + 0.0001), 0.0, 1.0);
          t = t * t * (3.0 - 2.0 * t);
          return mix(p0, p1, t);
        }

        void main() {
          vec2 baseUV = vWorldPos.xz / textureTileSize;

          // Apply parallax mapping
          vec2 parallaxUV = parallaxMapping(baseUV, vViewDir);

          // Sample with parallax-adjusted UVs
          vec4 color1 = texture2D(map, parallaxUV);
          vec4 color2 = texture2D(map, parallaxUV + uvOffset2);

          // Blend layers with noise
          float noise = snoise(vWorldPos.xz * noiseScale) * 0.5 + 0.5;
          vec4 finalColor = mix(color1, color2, noise);

          // Apply tint and sun light color
          finalColor.rgb *= tint;
          finalColor.rgb *= sunLightColor * sunIntensity;

          // Blend moss patches on top using noise-based masking
          if (hasMoss > 0.5) {
            vec2 mossUV = vWorldPos.xz / (textureTileSize * 0.05); // Moss tiles smaller for detail
            vec4 mossColor = texture2D(mossMap, mossUV);

            // Multi-octave noise for organic patch shapes
            float mossNoise = snoise(vWorldPos.xz * 1.5) * 0.5 + 0.5;
            mossNoise += snoise(vWorldPos.xz * 4.0) * 0.25;
            mossNoise *= snoise(vWorldPos.xz * 0.3 + vec2(17.3, 31.7)) * 0.5 + 0.5; // Large-scale variation
            mossNoise *= snoise(vWorldPos.xz * 0.08 + vec2(53.1, 11.9)) * 0.5 + 0.5; // Even larger-scale variation
            mossNoise = smoothstep(0.35, 0.50, mossNoise); // Threshold for patches

            // Use moss texture brightness as alpha (darker = more opaque moss)
            float mossBrightness = (mossColor.r + mossColor.g + mossColor.b) / 3.0;
            float mossAlpha = mossNoise * (1.0 - smoothstep(0.3, 0.7, mossBrightness));

            // Blend moss on top of mulch (darker, deeper green)
            vec3 mossTinted = mossColor.rgb * vec3(0.3, 0.7, 0.25);
            finalColor.rgb = mix(finalColor.rgb, mossTinted * sunLightColor * sunIntensity, mossAlpha);
          }

          gl_FragColor = finalColor;
        }
      `,
    });

    // Track this material for sun color updates
    this.groundMaterials.push(material);
    return material;
  }

  private renderPath(path: Path): void {
    const pathColors: Record<string, number> = {
      gravel: 0x9e9e9e,
      stone: 0x757575,
      brick: 0xa0522d,
      wood: 0x6b4423,
    };

    // Offset each path slightly in Y to prevent z-fighting at intersections
    const yOffset = 0.04 + this.pathIndex * 0.01;
    this.pathIndex++;

    for (let i = 0; i < path.points.length - 1; i++) {
      const start = path.points[i]!;
      const end = path.points[i + 1]!;

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      const centerX = (start.x + end.x) / 2;
      const centerZ = (start.z + end.z) / 2;

      // Use PlaneGeometry with high segment count for texture-driven displacement
      // ~24 segments per foot gives reasonable fidelity to texture detail
      const segsPerFoot = 4; // Low count - parallax handles detail
      const widthSegs = Math.max(4, Math.floor(path.width * segsPerFoot));
      const lengthSegs = Math.max(4, Math.floor(length * segsPerFoot));
      const pathGeometry = new THREE.PlaneGeometry(path.width, length, widthSegs, lengthSegs);
      pathGeometry.rotateX(-Math.PI / 2);

      // Add Perlin noise displacement
      const positions = pathGeometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < positions.count; j++) {
        const localX = positions.getX(j);
        const localZ = positions.getZ(j);
        // Transform to world coordinates for consistent noise
        const worldX = centerX + localX * Math.cos(angle) - localZ * Math.sin(angle);
        const worldZ = centerZ + localX * Math.sin(angle) + localZ * Math.cos(angle);
        const noise = perlinNoise(worldX * 0.5, worldZ * 0.5);
        positions.setY(j, positions.getY(j) + noise * 0.04);
      }
      pathGeometry.computeVertexNormals();

      // Use wood-chips texture for wood material, fallback colors for others
      let pathMaterial: THREE.ShaderMaterial | THREE.MeshStandardMaterial;
      if (path.material === "wood") {
        const woodChipsTexture = this.getRepeatingTexture("wood-chips", path.width, length);
        const mossTexture = this.textures.get("moss") || null;
        pathMaterial = this.createMulchMaterial(woodChipsTexture, pathColors[path.material]!, mossTexture);
      } else {
        pathMaterial = new THREE.MeshStandardMaterial({
          color: pathColors[path.material],
          roughness: 0.9,
        });
      }

      const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
      pathMesh.position.set(centerX, yOffset, centerZ);
      pathMesh.rotation.y = angle;
      pathMesh.receiveShadow = true;
      this.groundGroup!.add(pathMesh);
    }
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  // Toggle between grass/paths view and measurement grid
  setShowGrid(show: boolean): void {
    if (this.showGrid === show) return;
    this.showGrid = show;

    if (!this.currentGarden) return;

    if (show) {
      // Hide grass/paths, show grid
      if (this.groundGroup) {
        this.groundGroup.visible = false;
      }
      if (!this.gridGroup) {
        this.gridGroup = new THREE.Group();
        this.gardenGroup.add(this.gridGroup);
        this.renderGrid(this.currentGarden);
      }
      this.gridGroup.visible = true;
    } else {
      // Show grass/paths, hide grid
      if (this.groundGroup) {
        this.groundGroup.visible = true;
      }
      if (this.gridGroup) {
        this.gridGroup.visible = false;
      }
    }

    this.requestRender();
  }

  // Render measurement grid with feet ticks
  private renderGrid(garden: Garden): void {
    if (!this.gridGroup) return;

    const width = garden.dimensions.width;
    const length = garden.dimensions.length;
    const centerX = width / 2;
    const centerZ = length / 2;

    // Flat ground plane (neutral gray)
    const groundGeometry = new THREE.PlaneGeometry(width + 4, length + 4);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(centerX, -0.01, centerZ);
    ground.receiveShadow = true;
    this.gridGroup.add(ground);

    // Grid lines material
    const majorLineMaterial = new THREE.LineBasicMaterial({ color: 0x666666, linewidth: 2 });
    const minorLineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4 });

    // Draw grid lines - every foot, with major lines every 5 feet
    // Vertical lines (along X axis)
    for (let x = 0; x <= width; x++) {
      const isMajor = x % 5 === 0;
      const material = isMajor ? majorLineMaterial : minorLineMaterial;
      const points = [
        new THREE.Vector3(x, 0.01, 0),
        new THREE.Vector3(x, 0.01, length),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.gridGroup.add(line);
    }

    // Horizontal lines (along Z axis)
    for (let z = 0; z <= length; z++) {
      const isMajor = z % 5 === 0;
      const material = isMajor ? majorLineMaterial : minorLineMaterial;
      const points = [
        new THREE.Vector3(0, 0.01, z),
        new THREE.Vector3(width, 0.01, z),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.gridGroup.add(line);
    }

    // Create labels for X axis (along bottom, z=0)
    for (let x = 0; x <= width; x += 5) {
      const sprite = this.createTextSprite(`${x}'`, 0x333333);
      sprite.position.set(x, 0.2, -2);
      sprite.scale.set(4, 2, 1);
      this.gridGroup.add(sprite);
    }

    // Create labels for Z axis (along left side, x=0)
    for (let z = 0; z <= length; z += 5) {
      const sprite = this.createTextSprite(`${z}'`, 0x333333);
      sprite.position.set(-2, 0.2, z);
      sprite.scale.set(4, 2, 1);
      this.gridGroup.add(sprite);
    }
  }

  // Create a text sprite for grid labels
  private createTextSprite(text: string, _color: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = 128;
    canvas.height = 64;

    // Clear canvas to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text with black color and stroke for visibility
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = "#222222";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return new THREE.Sprite(material);
  }

  // Check if a click hit a bed and return its ID
  getBedAtPoint(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.gardenGroup.children, true);

    for (const intersect of intersects) {
      // Check if this mesh is part of a bed
      const bedId = this.bedMeshes.get(intersect.object);
      if (bedId) {
        return bedId;
      }
    }
    return null;
  }

  // Apply visual effect to a bed (hover or selection)
  private applyBedEffect(bedId: string, type: "hover" | "selected" | "none"): void {
    const group = this.bedGroups.get(bedId);
    if (!group) return;

    const originalY = this.originalPositions.get(bedId) ?? 0;

    // Visual parameters based on effect type
    const effects = {
      hover: {
        lift: 0,              // No lift, just color
        emissiveColor: 0xffcc66, // Warm golden glow
        emissiveIntensity: 0.5,  // Strong glow effect
      },
      selected: {
        lift: 0,              // No lift, just color
        emissiveColor: 0x81c784, // Natural green glow (matches garden theme)
        emissiveIntensity: 0.6,  // Stronger glow for selection
      },
      none: {
        lift: 0,
        emissiveColor: 0x000000,
        emissiveIntensity: 0,
      },
    };

    const effect = effects[type];

    // Apply lift animation
    group.position.y = originalY + effect.lift;

    // Apply material effect
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Store original material if not already stored
        if (!this.originalMaterials.has(obj)) {
          this.originalMaterials.set(obj, (obj.material as THREE.Material).clone());
        }

        if (type === "none") {
          // Restore original material
          const originalMat = this.originalMaterials.get(obj);
          if (originalMat) {
            obj.material = originalMat.clone();
          }
        } else {
          // Apply highlighted material
          const originalMat = this.originalMaterials.get(obj) as THREE.MeshStandardMaterial;
          if (originalMat) {
            const highlightMat = originalMat.clone();
            highlightMat.emissive = new THREE.Color(effect.emissiveColor);
            highlightMat.emissiveIntensity = effect.emissiveIntensity;
            obj.material = highlightMat;
          }
        }
      }
    });
  }

  // Update bed visual state based on hover and selection
  private updateBedVisuals(bedId: string): void {
    const isSelected = this.selectedBedId === bedId;
    const isHovered = this.hoveredBedId === bedId;

    if (isSelected) {
      this.applyBedEffect(bedId, "selected");
    } else if (isHovered) {
      this.applyBedEffect(bedId, "hover");
    } else {
      this.applyBedEffect(bedId, "none");
    }
  }

  // Set hovered bed (called on mouse move)
  setHoveredBed(bedId: string | null): void {
    if (this.hoveredBedId === bedId) return; // No change

    const previousHovered = this.hoveredBedId;
    this.hoveredBedId = bedId;

    // Update previous hovered bed
    if (previousHovered) {
      this.updateBedVisuals(previousHovered);
    }

    // Update new hovered bed
    if (bedId) {
      this.updateBedVisuals(bedId);
    }

    this.requestRender();
  }

  // Get currently hovered bed
  getHoveredBedId(): string | null {
    return this.hoveredBedId;
  }

  // Highlight selected bed
  selectBed(bedId: string | null): void {
    const previousSelected = this.selectedBedId;
    this.selectedBedId = bedId;

    // Update previous selected bed (might now be just hovered or nothing)
    if (previousSelected) {
      this.updateBedVisuals(previousSelected);
    }

    // Update new selected bed
    if (bedId) {
      this.updateBedVisuals(bedId);
    }

    this.requestRender();
  }

  // Clean up all THREE.js resources
  dispose(): void {
    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Dispose post-processing
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.ssaoPass = null;
    this.bloomPass = null;

    // Dispose of all geometries and materials in the scene
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // Dispose original materials
    this.originalMaterials.forEach((mat) => mat.dispose());
    this.originalMaterials.clear();

    // Dispose textures
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();

    // Clear maps
    this.bedMeshes.clear();
    this.bedGroups.clear();
    this.originalPositions.clear();

    // Dispose renderer and remove canvas
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

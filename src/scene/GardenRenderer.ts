import * as THREE from "three";
import type { Garden, GardenBed, Plant, Path, Fence, BirdNetting } from "../schemas/garden";

export const SCALE = 1; // 1 unit = 1 foot
const TEXTURE_TILE_SIZE = 4; // Each texture tile covers 4ft x 4ft

export class GardenRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gardenGroup: THREE.Group;
  private bedMeshes: Map<THREE.Object3D, string> = new Map();
  private bedGroups: Map<string, THREE.Group> = new Map();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private selectedBedId: string | null = null;
  private originalMaterials: Map<THREE.Object3D, THREE.Material> = new Map();
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private textures: Map<string, THREE.Texture> = new Map();
  private needsRender = true;
  private animationFrameId: number | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private gardenCenter: THREE.Vector3 = new THREE.Vector3();

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

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(1); // Force 1x for performance
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Faster shadows
    container.appendChild(this.renderer.domElement);

    this.gardenGroup = new THREE.Group();
    this.scene.add(this.gardenGroup);

    this.setupLighting();
    this.setupResizeHandler(container);
    this.loadTextures();
    this.animate();
  }

  private loadTextures(): void {
    // Load grass texture
    const grassTexture = this.textureLoader.load("/assets/grass.png");
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.set("grass", grassTexture);

    // Load wood-chips texture
    const woodChipsTexture = this.textureLoader.load("/assets/wood-chips.png");
    woodChipsTexture.wrapS = THREE.RepeatWrapping;
    woodChipsTexture.wrapT = THREE.RepeatWrapping;
    woodChipsTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.set("wood-chips", woodChipsTexture);
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
    // Hemisphere light for natural sky/ground color
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.6);
    this.scene.add(hemiLight);

    // Main sun light
    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
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

  // Update sun position based on time of day (0-24 hours)
  setSunTime(hour: number): void {
    if (!this.sunLight) return;

    // Convert hour to angle (6am = sunrise east, 12pm = noon south, 6pm = sunset west)
    // Hour 6 = 0°, Hour 12 = 90°, Hour 18 = 180°
    const dayProgress = (hour - 6) / 12; // 0 at 6am, 1 at 6pm
    const angle = dayProgress * Math.PI; // 0 to PI

    // Sun arc: rises in east (positive X), peaks in south, sets in west (negative X)
    const radius = 50;
    const elevation = Math.sin(angle) * radius * 0.8; // Max height at noon
    const x = Math.cos(angle) * radius;
    const z = -20; // Slightly south

    // Position sun relative to garden center
    this.sunLight.position.set(
      this.gardenCenter.x + x,
      Math.max(5, elevation), // Keep minimum height
      this.gardenCenter.z + z
    );
    this.sunLight.target.position.copy(this.gardenCenter);
    this.sunLight.target.updateMatrixWorld();

    // Adjust light color based on time (warmer at sunrise/sunset)
    const midday = Math.abs(hour - 12);
    if (midday > 4) {
      // Golden hour
      this.sunLight.color.setHex(0xffcc66);
      this.sunLight.intensity = 0.8;
    } else {
      // Midday
      this.sunLight.color.setHex(0xfff5e6);
      this.sunLight.intensity = 1.2;
    }

    // Update sky color
    const skyBrightness = Math.max(0.3, Math.sin(angle));
    const skyColor = new THREE.Color(0x87ceeb).multiplyScalar(skyBrightness);
    this.scene.background = skyColor;

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
      this.requestRender();
    });
    resizeObserver.observe(container);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
  };

  // Request a re-render on next frame
  requestRender(): void {
    this.needsRender = true;
  }

  renderGarden(garden: Garden): void {
    this.gardenGroup.clear();
    this.bedMeshes.clear();
    this.bedGroups.clear();
    this.originalMaterials.clear();
    this.selectedBedId = null;
    this.pathIndex = 0;

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
    const outerGrassGeometry = new THREE.CircleGeometry(outerGrassRadius, 64);
    const outerGrassTexture = this.getRepeatingTexture("grass", outerGrassRadius * 2, outerGrassRadius * 2);
    const outerGrassMaterial = new THREE.MeshStandardMaterial({
      map: outerGrassTexture,
      color: 0xcccccc, // Slightly tint to darken outer grass
      roughness: 0.95,
    });
    const outerGrass = new THREE.Mesh(outerGrassGeometry, outerGrassMaterial);
    outerGrass.rotation.x = -Math.PI / 2;
    outerGrass.position.set(centerX, -0.05, centerZ);
    outerGrass.receiveShadow = true;
    this.gardenGroup.add(outerGrass);

    // Main garden ground (inside fence)
    const groundGeometry = new THREE.PlaneGeometry(
      garden.dimensions.width,
      garden.dimensions.length,
      32,
      32
    );

    // Add slight vertex displacement for organic look
    const positions = groundGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      positions.setZ(i, z + (Math.random() - 0.5) * 0.05);
    }
    groundGeometry.computeVertexNormals();

    const innerGrassTexture = this.getRepeatingTexture("grass", garden.dimensions.width, garden.dimensions.length);
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: innerGrassTexture,
      roughness: 0.9,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(centerX, -0.01, centerZ);
    ground.receiveShadow = true;
    this.gardenGroup.add(ground);
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

    // Black deer mesh material - nearly invisible
    const meshMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, // Very dark gray/black
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });

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
        // No gates - full mesh panel
        const meshGeometry = new THREE.PlaneGeometry(length, fenceHeight);
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

    // Soil
    const soilGeometry = new THREE.BoxGeometry(
      bed.dimensions.width - boardThickness * 2,
      bed.dimensions.height - 0.05,
      bed.dimensions.length - boardThickness * 2
    );
    const soilMaterial = new THREE.MeshStandardMaterial({
      color: bed.soilColor,
      roughness: 1,
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.set(
      bed.position.x,
      bed.position.y + (bed.dimensions.height - 0.05) / 2,
      bed.position.z
    );
    soil.castShadow = true;
    soil.receiveShadow = true;
    bedGroup.add(soil);
    this.bedMeshes.set(soil, bed.id);

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
    // Galvanized metal material - shiny silver/gray with slight roughness
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x8a9a9a, // Silver-gray
      roughness: 0.4,
      metalness: 0.8,
    });

    // Top rim material - slightly darker
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x6a7a7a,
      roughness: 0.3,
      metalness: 0.9,
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

      const pathGeometry = new THREE.BoxGeometry(path.width, 0.08, length);

      // Use wood-chips texture for wood material, fallback colors for others
      let pathMaterial: THREE.MeshStandardMaterial;
      if (path.material === "wood") {
        const woodChipsTexture = this.getRepeatingTexture("wood-chips", path.width, length);
        pathMaterial = new THREE.MeshStandardMaterial({
          map: woodChipsTexture,
          color: woodChipsTexture ? 0xffffff : pathColors[path.material], // Fallback to brown if texture missing
          roughness: 0.95,
        });
      } else {
        pathMaterial = new THREE.MeshStandardMaterial({
          color: pathColors[path.material],
          roughness: 0.9,
        });
      }

      const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
      pathMesh.position.set((start.x + end.x) / 2, yOffset, (start.z + end.z) / 2);
      pathMesh.rotation.y = angle;
      pathMesh.receiveShadow = true;
      this.gardenGroup.add(pathMesh);
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

  // Highlight selected bed
  selectBed(bedId: string | null): void {
    // Restore previous selection
    if (this.selectedBedId) {
      const prevGroup = this.bedGroups.get(this.selectedBedId);
      if (prevGroup) {
        prevGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const originalMat = this.originalMaterials.get(obj);
            if (originalMat) {
              obj.material = originalMat;
            }
          }
        });
      }
    }

    this.selectedBedId = bedId;

    // Highlight new selection
    if (bedId) {
      const group = this.bedGroups.get(bedId);
      if (group) {
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            // Store original material if not already stored
            if (!this.originalMaterials.has(obj)) {
              this.originalMaterials.set(obj, obj.material as THREE.Material);
            }
            // Create highlighted material
            const originalMat = obj.material as THREE.MeshStandardMaterial;
            const highlightMat = originalMat.clone();
            highlightMat.emissive = new THREE.Color(0x4488ff);
            highlightMat.emissiveIntensity = 0.3;
            obj.material = highlightMat;
          }
        });
      }
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

    // Dispose renderer and remove canvas
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

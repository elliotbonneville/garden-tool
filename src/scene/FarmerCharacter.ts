import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Garden } from "../schemas/garden";

interface PathNode {
  id: number;
  position: THREE.Vector3;
  neighbors: Set<number>;
}

class PathGraph {
  private nodes: PathNode[] = [];
  private nodeIndex = new Map<string, number>();

  constructor(garden: Garden, groundY = 0.1, intersectionThreshold = 2) {
    this.buildFromGarden(garden, groundY, intersectionThreshold);
  }

  private getNodeKey(x: number, z: number): string {
    return `${x.toFixed(1)},${z.toFixed(1)}`;
  }

  private addNode(x: number, z: number, groundY: number): number {
    const key = this.getNodeKey(x, z);
    if (this.nodeIndex.has(key)) return this.nodeIndex.get(key)!;

    const id = this.nodes.length;
    this.nodes.push({
      id,
      position: new THREE.Vector3(x, groundY, z),
      neighbors: new Set(),
    });
    this.nodeIndex.set(key, id);
    return id;
  }

  private connect(a: number, b: number): void {
    this.nodes[a]?.neighbors.add(b);
    this.nodes[b]?.neighbors.add(a);
  }

  // Find intersection point of two line segments (in 2D, ignoring Y)
  private lineIntersection(
    p1: { x: number; z: number },
    p2: { x: number; z: number },
    p3: { x: number; z: number },
    p4: { x: number; z: number }
  ): { x: number; z: number } | null {
    const d1x = p2.x - p1.x;
    const d1z = p2.z - p1.z;
    const d2x = p4.x - p3.x;
    const d2z = p4.z - p3.z;

    const cross = d1x * d2z - d1z * d2x;
    if (Math.abs(cross) < 0.0001) return null; // Parallel lines

    const dx = p3.x - p1.x;
    const dz = p3.z - p1.z;

    const t = (dx * d2z - dz * d2x) / cross;
    const u = (dx * d1z - dz * d1x) / cross;

    // Check if intersection is within both segments (with small margin)
    if (t >= 0.01 && t <= 0.99 && u >= 0.01 && u <= 0.99) {
      return {
        x: p1.x + t * d1x,
        z: p1.z + t * d1z,
      };
    }
    return null;
  }

  private buildFromGarden(garden: Garden, groundY: number, _intersectionThreshold: number): void {
    if (garden.paths.length === 0) return;

    const POINT_SPACING = 3; // Add a point every 3 feet along paths

    // Collect all path segments
    type Segment = { p1: { x: number; z: number }; p2: { x: number; z: number }; pathIdx: number };
    const segments: Segment[] = [];

    for (let pathIdx = 0; pathIdx < garden.paths.length; pathIdx++) {
      const path = garden.paths[pathIdx]!;
      for (let i = 0; i < path.points.length - 1; i++) {
        segments.push({
          p1: { x: path.points[i]!.x, z: path.points[i]!.z },
          p2: { x: path.points[i + 1]!.x, z: path.points[i + 1]!.z },
          pathIdx,
        });
      }
    }

    // Find all intersection points between segments from different paths
    const intersections: { x: number; z: number; seg1: number; seg2: number }[] = [];
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        // Only check segments from different paths
        if (segments[i]!.pathIdx === segments[j]!.pathIdx) continue;

        const inter = this.lineIntersection(
          segments[i]!.p1, segments[i]!.p2,
          segments[j]!.p1, segments[j]!.p2
        );
        if (inter) {
          intersections.push({ ...inter, seg1: i, seg2: j });
        }
      }
    }


    // Build the graph: for each path, add nodes at regular intervals + intersections
    for (let pathIdx = 0; pathIdx < garden.paths.length; pathIdx++) {
      const path = garden.paths[pathIdx]!;

      // For each segment, generate points along it
      for (let segI = 0; segI < path.points.length - 1; segI++) {
        const p1 = path.points[segI]!;
        const p2 = path.points[segI + 1]!;

        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const segLen = Math.sqrt(dx * dx + dz * dz);

        // Collect all t values for points along this segment
        const tValues: number[] = [0, 1]; // Start and end

        // Add intermediate points at regular intervals
        const numIntermediatePoints = Math.floor(segLen / POINT_SPACING);
        for (let i = 1; i <= numIntermediatePoints; i++) {
          tValues.push(i / (numIntermediatePoints + 1));
        }

        // Add intersection points on this segment
        for (const inter of intersections) {
          const isOnThisSeg =
            (segments[inter.seg1]!.pathIdx === pathIdx && segments[inter.seg1]!.p1.x === p1.x && segments[inter.seg1]!.p1.z === p1.z) ||
            (segments[inter.seg2]!.pathIdx === pathIdx && segments[inter.seg2]!.p1.x === p1.x && segments[inter.seg2]!.p1.z === p1.z);

          if (isOnThisSeg && segLen > 0) {
            const ix = inter.x - p1.x;
            const iz = inter.z - p1.z;
            const t = (ix * dx + iz * dz) / (segLen * segLen);
            if (t > 0.01 && t < 0.99) {
              tValues.push(t);
            }
          }
        }

        // Sort and dedupe t values
        tValues.sort((a, b) => a - b);
        const uniqueT: number[] = [];
        for (const t of tValues) {
          if (uniqueT.length === 0 || t - uniqueT[uniqueT.length - 1]! > 0.01) {
            uniqueT.push(t);
          }
        }

        // Add nodes and connect consecutive ones
        let prevIdx: number | null = null;
        for (const t of uniqueT) {
          const x = p1.x + t * dx;
          const z = p1.z + t * dz;
          const idx = this.addNode(x, z, groundY);
          if (prevIdx !== null && prevIdx !== idx) {
            this.connect(prevIdx, idx);
          }
          prevIdx = idx;
        }
      }
    }

  }

  getNode(id: number): PathNode | undefined {
    return this.nodes[id];
  }

  getNodeCount(): number {
    return this.nodes.length;
  }

  getRandomNode(): PathNode | undefined {
    if (this.nodes.length === 0) return undefined;
    return this.nodes[Math.floor(Math.random() * this.nodes.length)];
  }

  // A* pathfinding to find route from start to goal
  findPath(startId: number, goalId: number): number[] {
    if (startId === goalId) return [startId];

    const openSet = new Set<number>([startId]);
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();

    gScore.set(startId, 0);
    const goalPos = this.nodes[goalId]!.position;
    fScore.set(startId, this.nodes[startId]!.position.distanceTo(goalPos));

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let current = -1;
      let lowestF = Infinity;
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = id;
        }
      }

      if (current === goalId) {
        // Reconstruct path
        const path: number[] = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current)!;
          path.unshift(current);
        }
        return path;
      }

      openSet.delete(current);
      const currentNode = this.nodes[current]!;

      for (const neighborId of currentNode.neighbors) {
        const neighborNode = this.nodes[neighborId]!;
        const tentativeG = (gScore.get(current) ?? Infinity) +
          currentNode.position.distanceTo(neighborNode.position);

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, current);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + neighborNode.position.distanceTo(goalPos));
          openSet.add(neighborId);
        }
      }
    }

    return []; // No path found
  }
}

export class FarmerCharacter {
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();

  private pathGraph: PathGraph | null = null;
  private currentPath: THREE.Vector3[] = [];
  private currentPathIndex = 0;
  private currentNodeId = 0;

  private speed = 3; // feet per second
  private targetRotation = 0;
  private groundY = 0.1;

  private scene: THREE.Scene;
  private isLoaded = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  load(garden: Garden): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build path graph from garden
      this.pathGraph = new PathGraph(garden, this.groundY);

      const loader = new GLTFLoader();
      loader.load(
        "/models/farmer.glb",
        (gltf) => {
          this.model = gltf.scene;
          this.model.scale.set(6, 6, 6);

          // Setup animation
          this.mixer = new THREE.AnimationMixer(this.model);
          if (gltf.animations.length > 0) {
            const fullClip = gltf.animations[0]!;
            const fps = 30;
            const walkEndFrame = Math.floor(fullClip.duration * fps / 10) - 5;
            const walkClip = THREE.AnimationUtils.subclip(fullClip, 'walk', 0, walkEndFrame, fps);

            const action = this.mixer.clipAction(walkClip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.timeScale = 0.85;
            action.play();
          }

          // Enable shadows
          this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Position at first node
          this.pickNewGoal();
          const startNode = this.pathGraph?.getNode(this.currentNodeId);
          if (startNode) {
            this.model.position.copy(startNode.position);
            this.model.position.y = 0;
          }

          this.scene.add(this.model);
          this.isLoaded = true;
          resolve();
        },
        undefined,
        (error) => {
          console.warn("Could not load farmer model:", error);
          reject(error);
        }
      );
    });
  }

  private pickNewGoal(): void {
    if (!this.pathGraph || this.pathGraph.getNodeCount() === 0) return;

    // Pick a random goal node that's different from current
    let goalNode = this.pathGraph.getRandomNode();
    let attempts = 0;
    while (goalNode && goalNode.id === this.currentNodeId && attempts < 10) {
      goalNode = this.pathGraph.getRandomNode();
      attempts++;
    }

    if (goalNode) {
      const pathIds = this.pathGraph.findPath(this.currentNodeId, goalNode.id);
      this.currentPath = pathIds.map(id => this.pathGraph!.getNode(id)!.position.clone());
      this.currentPathIndex = 0;
    }
  }

  update(): void {
    if (!this.model || !this.isLoaded) return;

    const delta = this.clock.getDelta();

    // Update animation
    if (this.mixer) {
      const savedPos = this.model.position.clone();
      const savedRot = this.model.rotation.y;
      this.mixer.update(delta);
      this.model.position.copy(savedPos);
      this.model.rotation.y = savedRot;
    }

    // Move along path
    this.updateMovement(delta);
  }

  private updateMovement(delta: number): void {
    if (!this.model) return;

    if (this.currentPath.length === 0) {
      // No path yet, try to get one
      this.pickNewGoal();
      return;
    }

    // Check if we need a new goal
    if (this.currentPathIndex >= this.currentPath.length) {
      // Update current node id to the last node we reached
      const lastPos = this.currentPath[this.currentPath.length - 1];
      if (lastPos && this.pathGraph) {
        // Find the node at this position
        for (let i = 0; i < this.pathGraph.getNodeCount(); i++) {
          const node = this.pathGraph.getNode(i);
          if (node && node.position.distanceTo(lastPos) < 0.5) {
            this.currentNodeId = i;
            break;
          }
        }
      }
      this.pickNewGoal();
      return;
    }

    const target = this.currentPath[this.currentPathIndex]!;
    const direction = new THREE.Vector3().subVectors(target, this.model.position);
    const horizontalDir = direction.clone().setY(0);
    const distance = horizontalDir.length();

    if (distance < 0.5) {
      // Reached waypoint
      this.currentPathIndex++;
    } else {
      // Move towards target
      horizontalDir.normalize();
      const moveDistance = Math.min(this.speed * delta, distance);
      this.model.position.x += horizontalDir.x * moveDistance;
      this.model.position.z += horizontalDir.z * moveDistance;
      this.model.position.y = target.y;

      // Smooth rotation
      this.targetRotation = Math.atan2(horizontalDir.x, horizontalDir.z);
      let diff = this.targetRotation - this.model.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.model.rotation.y += diff * 0.15;
    }
  }

  dispose(): void {
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.pathGraph = null;
    this.currentPath = [];
    this.isLoaded = false;
  }
}

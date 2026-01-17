# Garden Texture Prompts for GPT-Image-1.5

## Scale Standard

All textures should represent **4 feet x 4 feet** of real-world surface at **1024x1024 pixels**.
This means **1 pixel = ~0.047 inches** or **256 pixels = 1 foot**.

Use this scale reference in every prompt to ensure consistency.

---

## Required Textures

### 1. grass.png - Lawn Grass

**Prompt:**
```
Seamless tileable texture of healthy green lawn grass, top-down view, natural varied blade directions, mix of light and dark green tones, individual blades visible but dense coverage, natural organic look, soft shadows between blades, photorealistic, diffuse lighting, no harsh shadows. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with grass blades approximately 1-2 inches tall and densely packed at roughly 50 blades per square inch. Output: 1024x1024 pixels.
```

**Notes:** Used for outer lawn area and inside garden ground.

---

### 2. wood-chips.png - Wood Chip Mulch

**Prompt:**
```
Seamless tileable texture of natural wood chip mulch, top-down view, mix of light tan and medium brown tones, some bark visible, natural random scattered arrangement, organic garden path look, photorealistic, diffuse lighting, no harsh shadows. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with individual wood chips measuring 1-3 inches in length, showing approximately 20-30 chips across the full texture width. Output: 1024x1024 pixels.
```

**Notes:** Used for paths and Back to Eden bed surface. Primary path material.

---

### 3. soil.png - Garden Soil / Compost

**Prompt:**
```
Seamless tileable texture of rich dark garden soil mixed with compost, top-down view, dark brown to black color, some organic matter visible, slight moisture sheen, fine to medium granular texture, natural variation in tone, photorealistic, diffuse lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with soil particles and small organic debris ranging from tiny grains to 0.5 inch pieces, giving a natural fine-textured garden bed appearance. Output: 1024x1024 pixels.
```

**Notes:** Used for exposed soil in raised beds (visible between plants).

---

### 4. deer-fence-mesh.png - Poly Deer Fence

**Prompt:**
```
Seamless tileable texture of black poly deer fence mesh netting, front view, thin black plastic strands, transparent background showing through holes, high contrast, clean geometric pattern, photorealistic, even lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with 2 inch by 2 inch diamond or square mesh openings, meaning approximately 24 openings across the full texture width and 24 openings tall. Output: 1024x1024 pixels PNG with alpha transparency.
```

**Notes:** 8ft deer fence. Needs alpha transparency for holes. Apply to fence plane geometry.

---

### 5. hardware-cloth.png - 1/4" Hardware Cloth

**Prompt:**
```
Seamless tileable texture of galvanized steel hardware cloth wire mesh, front view, thin silver/gray galvanized wire, transparent background showing through holes, clean geometric grid pattern, slight metallic sheen, photorealistic, even lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with quarter inch (0.25 inch) square grid openings, meaning 48 openings per foot or 192 openings across the full texture width. The wire is very thin, approximately 1-2 pixels wide. Output: 1024x1024 pixels PNG with alpha transparency.
```

**Notes:** For rodent protection at bed bottoms. Needs alpha transparency. Very fine mesh - will appear as subtle grid pattern.

---

### 6. galvanized-metal.png - Raised Bed Sides

**Prompt:**
```
Seamless tileable texture of corrugated galvanized steel metal sheeting, front view, silver-gray metallic color with subtle zinc coating variations, slight weathered industrial look, matte metallic finish, photorealistic, diffuse lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with horizontal corrugation ridges spaced 2.67 inches apart (18 ridges across the full texture width), each ridge approximately 0.5 inches deep. Output: 1024x1024 pixels.
```

**Notes:** For raised bed sides. The beds are galvanized metal per the layout spec.

---

### 7. gravel.png - Gravel Path (Optional)

**Prompt:**
```
Seamless tileable texture of gray pea gravel path, top-down view, mix of gray tones with occasional tan and white stones, densely packed with small shadows between stones, natural random arrangement, photorealistic, diffuse lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with individual pea gravel stones measuring 0.25 to 0.5 inches in diameter (approximately 5-10 pixels each), showing hundreds of tightly packed stones across the surface. Output: 1024x1024 pixels.
```

**Notes:** Alternative path material. May use for accent areas.

---

### 8. bird-netting.png - Berry Protection Netting

**Prompt:**
```
Seamless tileable texture of white or light gray bird protection netting, front view, very thin nearly invisible strands, transparent background showing through holes, delicate barely visible pattern, photorealistic, even lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with 0.75 inch diamond mesh openings, meaning approximately 64 openings across the full texture width. Strands should be extremely thin (1 pixel wide). Output: 1024x1024 pixels PNG with alpha transparency.
```

**Notes:** For berry bed protection frames. Very subtle, mostly transparent.

---

### 9. straw-mulch.png - Straw Mulch (Optional)

**Prompt:**
```
Seamless tileable texture of golden straw mulch, top-down view, golden yellow to light tan color, random overlapping arrangement, natural organic garden mulch look, photorealistic, diffuse lighting, no harsh shadows. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with dried wheat or hay stalks measuring 3-6 inches long (64-128 pixels) and approximately 0.1-0.2 inches wide (2-4 pixels), layered in random directions. Output: 1024x1024 pixels.
```

**Notes:** Alternative mulch option for certain beds.

---

### 10. brick-path.png - Brick Paver Path (Optional)

**Prompt:**
```
Seamless tileable texture of red brick pavers in herringbone pattern, top-down view, classic red-orange brick color with natural variation, thin gray mortar lines between bricks, slightly weathered look, photorealistic, diffuse lighting. Scale: this texture represents exactly 4 feet by 4 feet of real-world surface (1 foot = 256 pixels), with standard brick size 4 by 8 inches (85 x 170 pixels each), showing approximately 6 bricks across the width and arranged in a herringbone pattern. Output: 1024x1024 pixels.
```

**Notes:** Optional decorative path material.

---

## Generation Tips

1. **Always specify "seamless tileable"** - Critical for repeating textures
2. **Always specify the 4ft x 4ft scale** - Ensures consistent sizing
3. **Always request 1024x1024** - Good balance of detail and file size
4. **Use "top-down view"** for ground textures, **"front view"** for vertical surfaces
5. **Request "diffuse lighting"** - Avoids baked-in shadows that look wrong when tiled
6. **For mesh textures**, request "transparent background" and export as PNG with alpha

## Three.js Usage

```typescript
const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('/assets/grass.png');

// Enable repeating
grassTexture.wrapS = THREE.RepeatWrapping;
grassTexture.wrapT = THREE.RepeatWrapping;

// Set repeat based on geometry size (4ft per texture tile)
const geometryWidthFeet = 40;
const geometryLengthFeet = 40;
grassTexture.repeat.set(geometryWidthFeet / 4, geometryLengthFeet / 4);

const material = new THREE.MeshStandardMaterial({
  map: grassTexture,
  roughness: 0.9,
});
```

## File Checklist

| Filename | Priority | Has Alpha |
|----------|----------|-----------|
| grass.png | Required | No |
| wood-chips.png | Required | No |
| soil.png | Required | No |
| deer-fence-mesh.png | Required | Yes |
| hardware-cloth.png | Required | Yes |
| galvanized-metal.png | Required | No |
| gravel.png | Optional | No |
| bird-netting.png | Optional | Yes |
| straw-mulch.png | Optional | No |
| brick-path.png | Optional | No |

// Minimap.js - Mini-map rendering

class Minimap {
  constructor(canvas, city, mainCamera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.mainCamera = mainCamera;

    // Minimap scale (pixels per tile)
    this.scale = Math.min(
      canvas.width / city.width,
      canvas.height / city.height
    );

    // Click to navigate
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());

    this.isDragging = false;
  }

  // Render the minimap
  render() {
    const ctx = this.ctx;
    const city = this.city;
    const scale = this.scale;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiles
    for (let y = 0; y < city.height; y++) {
      for (let x = 0; x < city.width; x++) {
        const tile = city.getTile(x, y);
        if (!tile) continue;

        const color = this.getTileColor(tile);
        ctx.fillStyle = color;
        ctx.fillRect(
          x * scale,
          y * scale,
          Math.max(1, scale),
          Math.max(1, scale)
        );
      }
    }

    // Draw viewport rectangle
    this.drawViewport();
  }

  // Get color for minimap tile
  getTileColor(tile) {
    if (tile.isWater()) return '#4060B0';
    if (tile.isForest()) return '#206020';
    if (tile.isRoad()) return '#8B7355';
    if (tile.isPowerLine()) return '#808080';
    if (tile.isRail()) return '#4A3728';

    if (tile.isResidential()) {
      if (tile.isBuilding()) {
        return tile.powered ? '#228B22' : '#550000';
      }
      return '#90EE90';
    }

    if (tile.isCommercial()) {
      if (tile.isBuilding()) {
        return tile.powered ? '#4169E1' : '#550000';
      }
      return '#87CEEB';
    }

    if (tile.isIndustrial()) {
      if (tile.isBuilding()) {
        return tile.powered ? '#B8860B' : '#550000';
      }
      return '#FFD700';
    }

    if (tile.isPowerPlant()) return '#FF4500';
    if (tile.type === TILE_TYPES.POLICE) return '#4169E1';
    if (tile.type === TILE_TYPES.FIRE) return '#FF4500';
    if (tile.isSpecialBuilding()) return '#DEB887';

    return '#90A060'; // Default grass
  }

  // Draw viewport rectangle
  drawViewport() {
    const ctx = this.ctx;
    const cam = this.mainCamera;

    // Calculate viewport position in minimap coordinates
    const topLeft = cam.screenToTile(0, 0);
    const bottomRight = cam.screenToTile(cam.canvas.width, cam.canvas.height);

    const x = topLeft.x * this.scale;
    const y = topLeft.y * this.scale;
    const width = (bottomRight.x - topLeft.x) * this.scale;
    const height = (bottomRight.y - topLeft.y) * this.scale;

    // Draw viewport rectangle
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  // Handle click to navigate
  onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tileX = Math.floor(x / this.scale);
    const tileY = Math.floor(y / this.scale);

    this.mainCamera.centerOn(tileX, tileY);
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.onClick(e);
  }

  onMouseMove(e) {
    if (this.isDragging) {
      this.onClick(e);
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  // Start render loop (synced with main renderer)
  start() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }
}

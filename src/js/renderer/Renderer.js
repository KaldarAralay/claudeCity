// Renderer.js - Main canvas rendering

class Renderer {
  constructor(canvas, city) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.simulation = null; // Set by Game.js for disaster rendering

    this.camera = new Camera(canvas);
    this.sprites = new TileSprites();

    // Overlay mode
    this.overlay = null; // null, 'power', 'traffic', 'pollution', 'crime', 'landvalue'

    // Selection/preview
    this.previewTool = null;
    this.previewX = -1;
    this.previewY = -1;
    this.previewValid = false;

    // Grid display
    this.showGrid = false;

    // Animation frame counter
    this.animFrame = 0;

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);

    this.resize();
  }

  // Handle canvas resize
  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.camera.clampPosition();
  }

  // Set the current tool preview
  setPreview(tool, x, y, valid) {
    this.previewTool = tool;
    this.previewX = x;
    this.previewY = y;
    this.previewValid = valid;
  }

  // Clear preview
  clearPreview() {
    this.previewTool = null;
    this.previewX = -1;
    this.previewY = -1;
  }

  // Set overlay mode
  setOverlay(overlay) {
    this.overlay = overlay;
  }

  // Main render loop
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get visible bounds
    const bounds = this.camera.getVisibleBounds();
    const scale = this.camera.zoom;
    const tileSize = this.camera.getScaledTileSize();

    // Render visible tiles
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const tile = this.city.getTile(x, y);
        if (!tile) continue;

        const screenPos = this.camera.tileToScreen(x, y);

        // Draw tile
        if (tile.isRoad()) {
          this.sprites.drawRoadConnected(
            this.ctx,
            this.city,
            x, y,
            screenPos.x,
            screenPos.y,
            scale
          );
        } else {
          this.sprites.drawTile(this.ctx, tile, screenPos.x, screenPos.y, scale);
        }

        // Draw overlay if active
        if (this.overlay) {
          this.drawOverlay(tile, screenPos.x, screenPos.y, tileSize);
        }
      }
    }

    // Draw grid if enabled
    if (this.showGrid && scale >= 0.5) {
      this.drawGrid(bounds, tileSize);
    }

    // Draw tool preview
    if (this.previewTool && this.previewX >= 0 && this.previewY >= 0) {
      this.drawPreview();
    }

    // Draw active disasters (monster, tornado)
    this.drawActiveDisasters();

    // Increment animation frame
    this.animFrame++;

    // Request next frame
    requestAnimationFrame(() => this.render());
  }

  // Draw active disasters
  drawActiveDisasters() {
    if (!this.simulation || !this.simulation.activeDisasters) return;

    const scale = this.camera.zoom;
    const disasters = this.simulation.activeDisasters;

    // Draw monster
    if (disasters.monster) {
      const monster = disasters.monster;
      const screenPos = this.camera.tileToScreen(monster.x, monster.y);
      this.sprites.drawMonster(this.ctx, screenPos.x, screenPos.y, scale);
    }

    // Draw tornado
    if (disasters.tornado) {
      const tornado = disasters.tornado;
      const screenPos = this.camera.tileToScreen(tornado.x, tornado.y);
      this.sprites.drawTornado(this.ctx, screenPos.x, screenPos.y, scale, this.animFrame);
    }
  }

  // Draw overlay for a tile
  drawOverlay(tile, screenX, screenY, size) {
    let value = 0;
    let color;

    switch (this.overlay) {
      case 'power':
        if (tile.conductsPower() || tile.isPowerPlant()) {
          color = tile.powered ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 0, 0, 0.4)';
          this.ctx.fillStyle = color;
          this.ctx.fillRect(screenX, screenY, size, size);
        }
        break;

      case 'traffic':
        value = tile.traffic / 255;
        if (value > 0) {
          const r = Math.floor(255 * value);
          const g = Math.floor(255 * (1 - value));
          this.ctx.fillStyle = `rgba(${r}, ${g}, 0, 0.5)`;
          this.ctx.fillRect(screenX, screenY, size, size);
        }
        break;

      case 'pollution':
        value = tile.pollution / 255;
        if (value > 0) {
          this.ctx.fillStyle = `rgba(139, 69, 19, ${value * 0.7})`;
          this.ctx.fillRect(screenX, screenY, size, size);
        }
        break;

      case 'crime':
        value = tile.crime / 255;
        if (value > 0.2) {
          const intensity = (value - 0.2) / 0.8;
          this.ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.5})`;
          this.ctx.fillRect(screenX, screenY, size, size);
        }
        break;

      case 'landvalue':
        value = tile.landValue / 255;
        const r = Math.floor(255 * (1 - value));
        const g = Math.floor(255 * value);
        this.ctx.fillStyle = `rgba(${r}, ${g}, 0, 0.4)`;
        this.ctx.fillRect(screenX, screenY, size, size);
        break;
    }
  }

  // Draw grid lines
  drawGrid(bounds, tileSize) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = bounds.minX; x <= bounds.maxX + 1; x++) {
      const screenX = this.camera.tileToScreen(x, 0).x;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = bounds.minY; y <= bounds.maxY + 1; y++) {
      const screenY = this.camera.tileToScreen(0, y).y;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }

  // Draw tool preview
  drawPreview() {
    const tool = this.previewTool;
    const tileSize = this.camera.getScaledTileSize();

    // Determine preview size
    let width = 1;
    let height = 1;

    if (tool === 'residential' || tool === 'commercial' || tool === 'industrial') {
      width = height = GAME_CONSTANTS.ZONE_SIZE;
    } else if (GAME_CONSTANTS.BUILDING_SIZES[tool]) {
      width = GAME_CONSTANTS.BUILDING_SIZES[tool].width;
      height = GAME_CONSTANTS.BUILDING_SIZES[tool].height;
    }

    const screenPos = this.camera.tileToScreen(this.previewX, this.previewY);

    // Draw preview rectangle
    this.ctx.fillStyle = this.previewValid ?
      'rgba(0, 255, 0, 0.3)' :
      'rgba(255, 0, 0, 0.3)';
    this.ctx.fillRect(
      screenPos.x,
      screenPos.y,
      width * tileSize,
      height * tileSize
    );

    // Draw border
    this.ctx.strokeStyle = this.previewValid ? '#0F0' : '#F00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      screenPos.x,
      screenPos.y,
      width * tileSize,
      height * tileSize
    );
  }

  // Start render loop
  start() {
    this.render();
  }

  // Get tile at screen position
  getTileAt(screenX, screenY) {
    return this.camera.screenToTile(screenX, screenY);
  }

  // Center camera on tile
  centerOn(x, y) {
    this.camera.centerOn(x, y);
  }
}

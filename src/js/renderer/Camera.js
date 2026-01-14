// Camera.js - Viewport and camera control

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.minZoom = 0.25;
    this.maxZoom = 4;
    this.tileSize = GAME_CONSTANTS.TILE_SIZE;

    // Dragging state
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Bounds
    this.mapWidth = GAME_CONSTANTS.MAP_WIDTH * this.tileSize;
    this.mapHeight = GAME_CONSTANTS.MAP_HEIGHT * this.tileSize;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom towards mouse position
      const oldZoom = this.zoom;
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomDelta));

      // Adjust position to zoom towards mouse
      const zoomRatio = this.zoom / oldZoom;
      this.x = mouseX - (mouseX - this.x) * zoomRatio;
      this.y = mouseY - (mouseY - this.y) * zoomRatio;

      this.clampPosition();
    });

    // Middle mouse / right mouse drag to pan
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || e.button === 2) { // Middle or right button
        e.preventDefault();
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.x += dx;
        this.y += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.clampPosition();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 1 || e.button === 2) {
        this.isDragging = false;
        this.canvas.style.cursor = '';
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = '';
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const panSpeed = 20;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          this.y += panSpeed;
          break;
        case 'ArrowDown':
        case 's':
          this.y -= panSpeed;
          break;
        case 'ArrowLeft':
        case 'a':
          this.x += panSpeed;
          break;
        case 'ArrowRight':
        case 'd':
          this.x -= panSpeed;
          break;
        case '+':
        case '=':
          this.zoomIn();
          break;
        case '-':
          this.zoomOut();
          break;
      }
      this.clampPosition();
    });
  }

  // Clamp camera position to keep map in view
  clampPosition() {
    const scaledMapWidth = this.mapWidth * this.zoom;
    const scaledMapHeight = this.mapHeight * this.zoom;

    // Allow some padding at edges
    const padding = 100;

    // Keep at least some of the map visible
    this.x = Math.max(-(scaledMapWidth - padding), Math.min(this.canvas.width - padding, this.x));
    this.y = Math.max(-(scaledMapHeight - padding), Math.min(this.canvas.height - padding, this.y));
  }

  // Zoom in
  zoomIn() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const oldZoom = this.zoom;
    this.zoom = Math.min(this.maxZoom, this.zoom * 1.2);

    const zoomRatio = this.zoom / oldZoom;
    this.x = centerX - (centerX - this.x) * zoomRatio;
    this.y = centerY - (centerY - this.y) * zoomRatio;

    this.clampPosition();
  }

  // Zoom out
  zoomOut() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const oldZoom = this.zoom;
    this.zoom = Math.max(this.minZoom, this.zoom / 1.2);

    const zoomRatio = this.zoom / oldZoom;
    this.x = centerX - (centerX - this.x) * zoomRatio;
    this.y = centerY - (centerY - this.y) * zoomRatio;

    this.clampPosition();
  }

  // Convert screen coordinates to tile coordinates
  screenToTile(screenX, screenY) {
    const worldX = (screenX - this.x) / this.zoom;
    const worldY = (screenY - this.y) / this.zoom;

    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }

  // Convert tile coordinates to screen coordinates
  tileToScreen(tileX, tileY) {
    return {
      x: tileX * this.tileSize * this.zoom + this.x,
      y: tileY * this.tileSize * this.zoom + this.y
    };
  }

  // Get visible tile bounds
  getVisibleBounds() {
    const topLeft = this.screenToTile(0, 0);
    const bottomRight = this.screenToTile(this.canvas.width, this.canvas.height);

    return {
      minX: Math.max(0, topLeft.x - 1),
      minY: Math.max(0, topLeft.y - 1),
      maxX: Math.min(GAME_CONSTANTS.MAP_WIDTH - 1, bottomRight.x + 1),
      maxY: Math.min(GAME_CONSTANTS.MAP_HEIGHT - 1, bottomRight.y + 1)
    };
  }

  // Center on a tile
  centerOn(tileX, tileY) {
    const targetX = tileX * this.tileSize * this.zoom;
    const targetY = tileY * this.tileSize * this.zoom;

    this.x = this.canvas.width / 2 - targetX;
    this.y = this.canvas.height / 2 - targetY;

    this.clampPosition();
  }

  // Get the scaled tile size
  getScaledTileSize() {
    return this.tileSize * this.zoom;
  }
}

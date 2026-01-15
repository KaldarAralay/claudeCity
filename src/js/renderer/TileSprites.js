// TileSprites.js - Procedural tile rendering

class TileSprites {
  constructor() {
    this.tileSize = GAME_CONSTANTS.TILE_SIZE;

    // Pre-rendered tile caches
    this.tileCache = new Map();
    this.buildingCache = new Map();

    // Generate basic tiles
    this.generateBaseTiles();
  }

  // Generate and cache base tile sprites
  generateBaseTiles() {
    // Generate each tile type
    Object.keys(TILE_COLORS).forEach(type => {
      if (!isNaN(type)) {
        this.tileCache.set(parseInt(type), this.generateTile(parseInt(type)));
      }
    });
  }

  // Generate a single tile sprite
  generateTile(type) {
    const canvas = document.createElement('canvas');
    canvas.width = this.tileSize;
    canvas.height = this.tileSize;
    const ctx = canvas.getContext('2d');

    const color = TILE_COLORS[type] || '#FF00FF'; // Magenta for missing

    switch (type) {
      case TILE_TYPES.EMPTY:
        this.drawGrass(ctx);
        break;
      case TILE_TYPES.WATER:
        this.drawWater(ctx);
        break;
      case TILE_TYPES.FOREST:
        this.drawForest(ctx);
        break;
      case TILE_TYPES.ROAD:
        this.drawRoad(ctx);
        break;
      case TILE_TYPES.POWER_LINE:
        this.drawPowerLine(ctx);
        break;
      case TILE_TYPES.RAIL:
        this.drawRail(ctx);
        break;
      case TILE_TYPES.PARK:
        this.drawPark(ctx);
        break;
      case TILE_TYPES.FIRE_BURNING:
        this.drawFire(ctx);
        break;
      case TILE_TYPES.RUBBLE:
        this.drawRubble(ctx);
        break;
      case TILE_TYPES.NUCLEAR_WASTE:
        this.drawNuclearWaste(ctx);
        break;
      case TILE_TYPES.FLOOD:
        this.drawFlood(ctx);
        break;
      case TILE_TYPES.ZONE_RESIDENTIAL:
        this.drawZone(ctx, '#90EE90', 'R');
        break;
      case TILE_TYPES.ZONE_COMMERCIAL:
        this.drawZone(ctx, '#87CEEB', 'C');
        break;
      case TILE_TYPES.ZONE_INDUSTRIAL:
        this.drawZone(ctx, '#FFD700', 'I');
        break;
      default:
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);
    }

    return canvas;
  }

  // Draw grass tile
  drawGrass(ctx) {
    ctx.fillStyle = '#90A060';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Add some variation
    ctx.fillStyle = '#A0B070';
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * this.tileSize;
      const y = Math.random() * this.tileSize;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Draw water tile
  drawWater(ctx) {
    ctx.fillStyle = '#4060B0';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Add wave pattern
    ctx.fillStyle = '#5070C0';
    for (let y = 0; y < this.tileSize; y += 4) {
      ctx.fillRect(0, y, this.tileSize, 1);
    }
  }

  // Draw forest tile
  drawForest(ctx) {
    // Ground
    ctx.fillStyle = '#206020';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Trees (simple circles)
    ctx.fillStyle = '#008000';
    ctx.beginPath();
    ctx.arc(this.tileSize / 2, this.tileSize / 2, this.tileSize / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#006600';
    ctx.beginPath();
    ctx.arc(this.tileSize / 2, this.tileSize / 2 + 2, this.tileSize / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw road tile
  drawRoad(ctx) {
    // Dirt/asphalt base
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Road surface
    ctx.fillStyle = '#5C4A3A';
    ctx.fillRect(2, 2, this.tileSize - 4, this.tileSize - 4);

    // Center line
    ctx.fillStyle = '#AAA';
    ctx.fillRect(this.tileSize / 2 - 1, 0, 2, this.tileSize);
  }

  // Draw power line tile
  drawPowerLine(ctx) {
    // Background (grass)
    this.drawGrass(ctx);

    // Pole
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(this.tileSize / 2 - 1, 4, 2, this.tileSize - 4);

    // Cross beam
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(2, 4, this.tileSize - 4, 2);

    // Wires
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(this.tileSize, 6);
    ctx.stroke();
  }

  // Draw rail tile
  drawRail(ctx) {
    // Ground
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Rail ties
    ctx.fillStyle = '#4A3728';
    for (let y = 2; y < this.tileSize; y += 4) {
      ctx.fillRect(3, y, this.tileSize - 6, 2);
    }

    // Rails
    ctx.fillStyle = '#666';
    ctx.fillRect(4, 0, 2, this.tileSize);
    ctx.fillRect(this.tileSize - 6, 0, 2, this.tileSize);
  }

  // Draw park tile
  drawPark(ctx) {
    // Grass base
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Tree
    ctx.fillStyle = '#006400';
    ctx.beginPath();
    ctx.arc(this.tileSize / 2, this.tileSize / 2 - 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Tree trunk
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(this.tileSize / 2 - 1, this.tileSize / 2 + 2, 2, 4);

    // Flowers/details
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(11, 11, 2, 2);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(10, 4, 2, 2);
  }

  // Draw burning fire tile
  drawFire(ctx) {
    // Charred ground
    ctx.fillStyle = '#2F2F2F';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Flames
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.moveTo(this.tileSize / 2, 2);
    ctx.lineTo(this.tileSize - 3, this.tileSize - 2);
    ctx.lineTo(3, this.tileSize - 2);
    ctx.closePath();
    ctx.fill();

    // Inner flame
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(this.tileSize / 2, 5);
    ctx.lineTo(this.tileSize - 5, this.tileSize - 3);
    ctx.lineTo(5, this.tileSize - 3);
    ctx.closePath();
    ctx.fill();
  }

  // Draw rubble tile
  drawRubble(ctx) {
    // Ground
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Rubble pieces
    ctx.fillStyle = '#696969';
    ctx.fillRect(2, 8, 4, 3);
    ctx.fillRect(7, 5, 5, 4);
    ctx.fillRect(10, 10, 3, 3);
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(4, 3, 3, 3);
    ctx.fillRect(1, 11, 4, 2);
  }

  // Draw nuclear waste - glowing green toxic waste
  drawNuclearWaste(ctx) {
    // Dark contaminated ground
    ctx.fillStyle = '#2A2A20';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Toxic green pools
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(3, 3, 5, 4);
    ctx.fillRect(8, 7, 6, 5);
    ctx.fillRect(2, 10, 4, 3);

    // Glowing effect
    ctx.fillStyle = '#80FF80';
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(10, 9, 2, 2);

    // Radiation symbol hint
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(7, 2, 2, 2);

    // Bubbles
    ctx.fillStyle = '#00CC00';
    ctx.fillRect(5, 8, 1, 1);
    ctx.fillRect(12, 11, 1, 1);
  }

  // Draw flood water
  drawFlood(ctx) {
    // Murky flood water
    ctx.fillStyle = '#3A6090';
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Water ripples
    ctx.fillStyle = '#5080B0';
    ctx.fillRect(2, 3, 4, 1);
    ctx.fillRect(8, 7, 5, 1);
    ctx.fillRect(1, 11, 6, 1);

    // Debris floating
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(10, 2, 3, 2);
    ctx.fillRect(3, 8, 2, 2);
  }

  // Draw zone placeholder
  drawZone(ctx, color, letter) {
    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.tileSize - 1, this.tileSize - 1);

    // Dashed inner pattern to indicate empty zone
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeRect(2.5, 2.5, this.tileSize - 5, this.tileSize - 5);
    ctx.setLineDash([]);
  }

  // Draw a building tile based on type, level, and class
  // SimCity Classic style with visible roofs, shadows, and recognizable shapes
  // Residential: levels 1-9 (R-TOP), Commercial: levels 1-5 (C-TOP), Industrial: levels 1-4 (I-4)
  drawBuilding(ctx, type, level, zoneClass, x, y, width, height, isMainTile) {
    const ts = this.tileSize;

    // Class-based color adjustments
    const classColorShift = {
      'low': -15,
      'mid': 0,
      'upper': 8,
      'high': 15
    };
    const colorShift = classColorShift[zoneClass] || 0;

    // Draw grass base first
    ctx.fillStyle = '#5A8A3A';
    ctx.fillRect(0, 0, ts, ts);

    // Add grass texture
    ctx.fillStyle = '#6A9A4A';
    ctx.fillRect(1, 3, 2, 2);
    ctx.fillRect(10, 8, 2, 2);
    ctx.fillRect(5, 12, 2, 2);

    if (type === 'residential') {
      this.drawResidentialBuilding(ctx, level, zoneClass, colorShift);
    } else if (type === 'commercial') {
      this.drawCommercialBuilding(ctx, level, zoneClass, colorShift);
    } else if (type === 'industrial') {
      this.drawIndustrialBuilding(ctx, level, zoneClass, colorShift);
    }
  }

  // Draw residential buildings - SimCity Classic style
  drawResidentialBuilding(ctx, level, zoneClass, colorShift) {
    const ts = this.tileSize;

    if (level <= 2) {
      // Small house with peaked roof
      const wallColor = this.adjustColorBrightness('#C4B090', colorShift);
      const roofColor = this.adjustColorBrightness('#8B4513', colorShift);
      const shadowColor = this.adjustColorBrightness('#8A7A60', colorShift);

      // House body
      ctx.fillStyle = wallColor;
      ctx.fillRect(2, 7, 12, 7);

      // Right shadow
      ctx.fillStyle = shadowColor;
      ctx.fillRect(12, 7, 2, 7);

      // Peaked roof
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(1, 7);
      ctx.lineTo(8, 2);
      ctx.lineTo(15, 7);
      ctx.closePath();
      ctx.fill();

      // Roof shadow
      ctx.fillStyle = this.adjustColorBrightness('#5A2A0A', colorShift);
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(15, 7);
      ctx.lineTo(15, 8);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();

      // Door
      ctx.fillStyle = '#4A3020';
      ctx.fillRect(7, 10, 3, 4);

      // Window
      ctx.fillStyle = zoneClass === 'high' ? '#FFFFC0' : '#87CEEB';
      ctx.fillRect(3, 9, 3, 3);
      if (level >= 2) {
        ctx.fillRect(11, 9, 2, 3);
      }

    } else if (level <= 4) {
      // Duplex/rowhouse
      const wallColor = this.adjustColorBrightness('#D4C4A8', colorShift);
      const roofColor = this.adjustColorBrightness('#6B4423', colorShift);

      // Building body
      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 5, 14, 9);

      // Shadow side
      ctx.fillStyle = this.adjustColorBrightness('#A49478', colorShift);
      ctx.fillRect(13, 5, 2, 9);

      // Flat roof with slight overhang look
      ctx.fillStyle = roofColor;
      ctx.fillRect(0, 4, 16, 2);
      ctx.fillStyle = this.adjustColorBrightness('#4A2A13', colorShift);
      ctx.fillRect(0, 5, 16, 1);

      // Windows (two floors)
      ctx.fillStyle = zoneClass === 'high' ? '#FFFFC0' : '#87CEEB';
      ctx.fillRect(2, 7, 2, 2);
      ctx.fillRect(6, 7, 2, 2);
      ctx.fillRect(10, 7, 2, 2);
      ctx.fillRect(2, 11, 2, 2);
      ctx.fillRect(6, 11, 2, 2);
      ctx.fillRect(10, 11, 2, 2);

      // Door
      ctx.fillStyle = '#3A2515';
      ctx.fillRect(4, 11, 2, 3);

    } else if (level <= 6) {
      // Apartment building
      const wallColor = this.adjustColorBrightness('#B8A888', colorShift);

      // Building body
      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 3, 14, 11);

      // Shadow side
      ctx.fillStyle = this.adjustColorBrightness('#887858', colorShift);
      ctx.fillRect(13, 3, 2, 11);

      // Roof
      ctx.fillStyle = '#444';
      ctx.fillRect(0, 2, 16, 2);
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 3, 16, 1);

      // Window grid
      ctx.fillStyle = zoneClass === 'high' ? '#FFFFC0' : '#87CEEB';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          ctx.fillRect(2 + col * 3, 5 + row * 3, 2, 2);
        }
      }

      // Entrance
      ctx.fillStyle = '#2A1A10';
      ctx.fillRect(6, 12, 4, 2);

    } else if (level <= 8) {
      // High-rise apartment
      const wallColor = this.adjustColorBrightness('#A09080', colorShift);

      // Building body (taller appearance)
      ctx.fillStyle = wallColor;
      ctx.fillRect(2, 1, 12, 13);

      // Shadow side
      ctx.fillStyle = this.adjustColorBrightness('#706050', colorShift);
      ctx.fillRect(12, 1, 2, 13);

      // Roof
      ctx.fillStyle = '#333';
      ctx.fillRect(1, 0, 14, 2);

      // Window grid (more windows for high-rise)
      ctx.fillStyle = zoneClass === 'high' ? '#FFFFC0' : '#87CEEB';
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
          ctx.fillRect(3 + col * 3, 2 + row * 2 + (row > 0 ? row : 0), 2, 1);
        }
      }

      // Ground floor / entrance
      ctx.fillStyle = '#504030';
      ctx.fillRect(2, 13, 12, 1);
      ctx.fillStyle = '#FFE';
      ctx.fillRect(6, 13, 4, 1);

    } else {
      // R-TOP - Luxury tower
      const wallColor = this.adjustColorBrightness('#E8E0D8', colorShift);

      // Main tower
      ctx.fillStyle = wallColor;
      ctx.fillRect(3, 0, 10, 14);

      // Shadow side
      ctx.fillStyle = this.adjustColorBrightness('#B8B0A8', colorShift);
      ctx.fillRect(11, 0, 2, 14);

      // Penthouse top
      ctx.fillStyle = '#222';
      ctx.fillRect(4, 0, 8, 1);

      // Antenna
      ctx.fillStyle = '#888';
      ctx.fillRect(7, 0, 2, 1);
      ctx.fillRect(8, 0, 1, -2 + 2); // Small antenna tip

      // Blue-tinted windows for luxury
      ctx.fillStyle = zoneClass === 'high' ? '#C0D8FF' : '#88AACC';
      for (let row = 0; row < 6; row++) {
        ctx.fillRect(4, 1 + row * 2, 8, 1);
      }

      // Entrance
      ctx.fillStyle = '#3A3A4A';
      ctx.fillRect(3, 13, 10, 1);
      ctx.fillStyle = '#FFE8C0';
      ctx.fillRect(6, 13, 4, 1);
    }
  }

  // Draw commercial buildings - SimCity Classic style
  drawCommercialBuilding(ctx, level, zoneClass, colorShift) {
    const ts = this.tileSize;

    if (level <= 1) {
      // Small shop
      const wallColor = this.adjustColorBrightness('#A8B8C8', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 6, 14, 8);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#7888A8', colorShift);
      ctx.fillRect(13, 6, 2, 8);

      // Awning
      ctx.fillStyle = '#C02020';
      ctx.fillRect(0, 5, 16, 2);
      ctx.fillStyle = '#901010';
      ctx.fillRect(0, 6, 16, 1);

      // Storefront window
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(2, 8, 10, 4);

      // Door
      ctx.fillStyle = '#404040';
      ctx.fillRect(12, 9, 2, 5);

    } else if (level <= 3) {
      // Office building
      const wallColor = this.adjustColorBrightness('#8899AA', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 3, 14, 11);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#5869AA', colorShift);
      ctx.fillRect(13, 3, 2, 11);

      // Roof
      ctx.fillStyle = '#334';
      ctx.fillRect(0, 2, 16, 2);

      // Window grid
      ctx.fillStyle = zoneClass === 'high' ? '#C0D8FF' : '#6688AA';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(2 + col * 4, 5 + row * 3, 3, 2);
        }
      }

      // Entrance
      ctx.fillStyle = '#223';
      ctx.fillRect(5, 12, 6, 2);

    } else if (level <= 4) {
      // Larger office
      const wallColor = this.adjustColorBrightness('#7080A0', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 1, 14, 13);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#405080', colorShift);
      ctx.fillRect(13, 1, 2, 13);

      // Roof
      ctx.fillStyle = '#223';
      ctx.fillRect(0, 0, 16, 2);

      // Horizontal window bands
      ctx.fillStyle = zoneClass === 'high' ? '#A0C0E0' : '#5070A0';
      ctx.fillRect(2, 3, 11, 2);
      ctx.fillRect(2, 6, 11, 2);
      ctx.fillRect(2, 9, 11, 2);

      // Entrance
      ctx.fillStyle = '#112';
      ctx.fillRect(5, 12, 6, 2);
      ctx.fillStyle = '#FFE';
      ctx.fillRect(6, 13, 4, 1);

    } else {
      // C-TOP - Skyscraper
      const wallColor = this.adjustColorBrightness('#5060A0', colorShift);

      // Main tower
      ctx.fillStyle = wallColor;
      ctx.fillRect(2, 0, 12, 14);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#303080', colorShift);
      ctx.fillRect(12, 0, 2, 14);

      // Spire
      ctx.fillStyle = '#666';
      ctx.fillRect(7, 0, 2, 1);
      ctx.fillRect(7, -1 + 1, 2, 1);

      // Glass curtain wall effect
      ctx.fillStyle = zoneClass === 'high' ? '#80B0E0' : '#4080C0';
      for (let row = 0; row < 6; row++) {
        ctx.fillRect(3, 1 + row * 2, 9, 1);
      }

      // Top accent
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(2, 0, 12, 1);

      // Entrance
      ctx.fillStyle = '#112';
      ctx.fillRect(2, 13, 12, 1);
      ctx.fillStyle = '#FFE8C0';
      ctx.fillRect(5, 13, 6, 1);
    }
  }

  // Draw industrial buildings - SimCity Classic style
  drawIndustrialBuilding(ctx, level, zoneClass, colorShift) {
    const ts = this.tileSize;

    if (level <= 1) {
      // Small warehouse
      const wallColor = this.adjustColorBrightness('#B0A080', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 6, 14, 8);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#807050', colorShift);
      ctx.fillRect(13, 6, 2, 8);

      // Corrugated roof
      ctx.fillStyle = '#666';
      ctx.fillRect(0, 4, 16, 3);
      ctx.fillStyle = '#555';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(i * 2, 5, 1, 2);
      }

      // Loading door
      ctx.fillStyle = '#444';
      ctx.fillRect(3, 9, 6, 5);

      // Small window
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(11, 8, 3, 2);

    } else if (level <= 2) {
      // Factory
      const wallColor = this.adjustColorBrightness('#A09070', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(1, 5, 14, 9);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#706040', colorShift);
      ctx.fillRect(13, 5, 2, 9);

      // Sawtooth roof
      ctx.fillStyle = '#555';
      ctx.fillRect(0, 3, 16, 3);
      ctx.fillStyle = '#666';
      ctx.fillRect(0, 3, 8, 2);

      // Smokestack
      ctx.fillStyle = '#444';
      ctx.fillRect(12, 0, 3, 5);
      ctx.fillStyle = '#333';
      ctx.fillRect(14, 0, 1, 5);

      // Smoke
      ctx.fillStyle = 'rgba(100,100,100,0.6)';
      ctx.beginPath();
      ctx.arc(13, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Windows
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(2, 7, 4, 3);
      ctx.fillRect(7, 7, 4, 3);

      // Door
      ctx.fillStyle = '#333';
      ctx.fillRect(3, 11, 4, 3);

    } else if (level <= 3) {
      // Large factory
      const wallColor = this.adjustColorBrightness('#908060', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(0, 4, 16, 10);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#605030', colorShift);
      ctx.fillRect(14, 4, 2, 10);

      // Roof
      ctx.fillStyle = '#444';
      ctx.fillRect(0, 3, 16, 2);

      // Two smokestacks
      ctx.fillStyle = '#555';
      ctx.fillRect(2, 0, 3, 4);
      ctx.fillRect(10, 0, 3, 4);
      ctx.fillStyle = '#444';
      ctx.fillRect(4, 0, 1, 4);
      ctx.fillRect(12, 0, 1, 4);

      // Smoke
      ctx.fillStyle = 'rgba(80,80,80,0.5)';
      ctx.beginPath();
      ctx.arc(3, -1, 2, 0, Math.PI * 2);
      ctx.arc(11, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Industrial windows
      ctx.fillStyle = '#6688AA';
      ctx.fillRect(1, 6, 3, 2);
      ctx.fillRect(5, 6, 3, 2);
      ctx.fillRect(9, 6, 3, 2);

      // Large cargo door
      ctx.fillStyle = '#333';
      ctx.fillRect(4, 10, 8, 4);
      ctx.fillStyle = '#444';
      ctx.fillRect(4, 10, 8, 1);

    } else {
      // I-4 - Industrial complex
      const wallColor = this.adjustColorBrightness('#807050', colorShift);

      ctx.fillStyle = wallColor;
      ctx.fillRect(0, 3, 16, 11);

      // Shadow
      ctx.fillStyle = this.adjustColorBrightness('#504020', colorShift);
      ctx.fillRect(14, 3, 2, 11);

      // Multiple smokestacks
      ctx.fillStyle = '#444';
      ctx.fillRect(1, 0, 2, 4);
      ctx.fillRect(5, 0, 2, 5);
      ctx.fillRect(9, 0, 2, 4);
      ctx.fillRect(13, 0, 2, 3);

      // Stack shadows
      ctx.fillStyle = '#333';
      ctx.fillRect(2, 0, 1, 4);
      ctx.fillRect(6, 0, 1, 5);
      ctx.fillRect(10, 0, 1, 4);
      ctx.fillRect(14, 0, 1, 3);

      // Heavy smoke
      ctx.fillStyle = 'rgba(60,60,60,0.6)';
      ctx.beginPath();
      ctx.arc(2, -1, 2, 0, Math.PI * 2);
      ctx.arc(6, -2, 3, 0, Math.PI * 2);
      ctx.arc(10, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Roof structure
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 2, 16, 2);

      // Industrial pipes
      ctx.fillStyle = '#666';
      ctx.fillRect(0, 6, 16, 1);
      ctx.fillRect(0, 10, 16, 1);

      // Large industrial door
      ctx.fillStyle = '#222';
      ctx.fillRect(5, 11, 6, 3);
    }
  }

  // Helper: Adjust color brightness
  adjustColorBrightness(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Draw special building tile
  drawSpecialBuilding(ctx, type, tileX, tileY, buildingWidth, buildingHeight) {
    const colors = {
      [TILE_TYPES.COAL_POWER]: '#333',
      [TILE_TYPES.NUCLEAR_POWER]: '#FFD700',
      [TILE_TYPES.POLICE]: '#4169E1',
      [TILE_TYPES.FIRE]: '#FF4500',
      [TILE_TYPES.STADIUM]: '#DEB887',
      [TILE_TYPES.SEAPORT]: '#4682B4',
      [TILE_TYPES.AIRPORT]: '#808080'
    };

    const color = colors[type] || '#888';

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // Only draw borders on edges
    if (tileX === 0) {
      ctx.beginPath();
      ctx.moveTo(0.5, 0);
      ctx.lineTo(0.5, this.tileSize);
      ctx.stroke();
    }
    if (tileY === 0) {
      ctx.beginPath();
      ctx.moveTo(0, 0.5);
      ctx.lineTo(this.tileSize, 0.5);
      ctx.stroke();
    }
    if (tileX === buildingWidth - 1) {
      ctx.beginPath();
      ctx.moveTo(this.tileSize - 0.5, 0);
      ctx.lineTo(this.tileSize - 0.5, this.tileSize);
      ctx.stroke();
    }
    if (tileY === buildingHeight - 1) {
      ctx.beginPath();
      ctx.moveTo(0, this.tileSize - 0.5);
      ctx.lineTo(this.tileSize, this.tileSize - 0.5);
      ctx.stroke();
    }

    // Special features for power plants
    if (type === TILE_TYPES.COAL_POWER) {
      // Smokestack on corner
      if (tileX === 0 && tileY === 0) {
        ctx.fillStyle = '#666';
        ctx.fillRect(2, 2, 6, 12);
        ctx.fillStyle = '#888';
        ctx.fillRect(8, 4, 4, 8);
        // Smoke
        ctx.fillStyle = 'rgba(100,100,100,0.5)';
        ctx.beginPath();
        ctx.arc(5, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === TILE_TYPES.NUCLEAR_POWER) {
      // Cooling tower shape
      if (tileX === 1 && tileY === 1) {
        ctx.fillStyle = '#CCC';
        ctx.beginPath();
        ctx.arc(this.tileSize, this.tileSize, this.tileSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Get a tile sprite
  getSprite(type) {
    if (!this.tileCache.has(type)) {
      this.tileCache.set(type, this.generateTile(type));
    }
    return this.tileCache.get(type);
  }

  // Draw a tile to context
  drawTile(ctx, tile, screenX, screenY, scale) {
    const size = this.tileSize * scale;

    // Determine what to draw
    if (tile.isBuilding()) {
      // Draw developed zone building
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.scale(scale, scale);
      this.drawBuilding(
        ctx,
        tile.zoneType,
        tile.level,  // Use level instead of density for accurate zone progression
        tile.zoneClass, // Pass zone class for appearance variations
        tile.x,
        tile.y,
        tile.buildingWidth,
        tile.buildingHeight,
        tile.isMainTile
      );
      ctx.restore();
    } else if (tile.isSpecialBuilding()) {
      // Draw special building
      const building = tile.buildingId ? { width: tile.buildingWidth, height: tile.buildingHeight } : { width: 1, height: 1 };
      const mainTile = tile.isMainTile ? tile : null;
      let relX = 0, relY = 0;

      // Calculate relative position within building
      if (tile.buildingId && !tile.isMainTile) {
        // Find main tile to get building position
        relX = 0; // Simplified - would need to track position properly
        relY = 0;
      }

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.scale(scale, scale);
      this.drawSpecialBuilding(ctx, tile.type, relX, relY, building.width, building.height);
      ctx.restore();
    } else {
      // Draw from cache
      const sprite = this.getSprite(tile.type);
      if (sprite) {
        ctx.drawImage(sprite, screenX, screenY, size, size);
      }
    }

    // Power indicator
    if ((tile.isZone() || tile.isBuilding()) && !tile.powered) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(screenX, screenY, size, size);

      // No power symbol
      ctx.fillStyle = '#FF0000';
      ctx.font = `${Math.max(8, 10 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', screenX + size / 2, screenY + size / 2);
    }
  }

  // Draw road with proper connections
  drawRoadConnected(ctx, city, x, y, screenX, screenY, scale) {
    const size = this.tileSize * scale;

    // Check adjacent tiles for roads
    const hasNorth = city.getTile(x, y - 1)?.isRoad();
    const hasSouth = city.getTile(x, y + 1)?.isRoad();
    const hasEast = city.getTile(x + 1, y)?.isRoad();
    const hasWest = city.getTile(x - 1, y)?.isRoad();

    // Base road color
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(screenX, screenY, size, size);

    // Draw road surface
    ctx.fillStyle = '#5C4A3A';
    const roadWidth = size * 0.7;
    const roadOffset = (size - roadWidth) / 2;

    // Vertical road
    if (hasNorth || hasSouth) {
      ctx.fillRect(
        screenX + roadOffset,
        hasNorth ? screenY : screenY + roadOffset,
        roadWidth,
        (hasNorth && hasSouth) ? size : size - roadOffset
      );
    }

    // Horizontal road
    if (hasEast || hasWest) {
      ctx.fillRect(
        hasWest ? screenX : screenX + roadOffset,
        screenY + roadOffset,
        (hasEast && hasWest) ? size : size - roadOffset,
        roadWidth
      );
    }

    // Center intersection if needed
    if ((hasNorth || hasSouth) && (hasEast || hasWest)) {
      ctx.fillRect(screenX + roadOffset, screenY + roadOffset, roadWidth, roadWidth);
    }

    // If no connections, draw as standalone
    if (!hasNorth && !hasSouth && !hasEast && !hasWest) {
      ctx.fillRect(screenX + roadOffset, screenY + roadOffset, roadWidth, roadWidth);
    }
  }

  // Draw monster (Bowser-like creature)
  drawMonster(ctx, screenX, screenY, scale) {
    const size = this.tileSize * scale * 2; // Monster is 2x2 tiles

    ctx.save();
    ctx.translate(screenX - size / 4, screenY - size / 2);

    // Body - green dinosaur/dragon
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.6, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell/back spikes
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.4);
    ctx.lineTo(size * 0.35, size * 0.15);
    ctx.lineTo(size * 0.45, size * 0.35);
    ctx.lineTo(size * 0.55, size * 0.1);
    ctx.lineTo(size * 0.65, size * 0.35);
    ctx.lineTo(size * 0.75, size * 0.2);
    ctx.lineTo(size * 0.75, size * 0.45);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.ellipse(size * 0.75, size * 0.5, size * 0.2, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.ellipse(size * 0.88, size * 0.52, size * 0.1, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye - angry red
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(size * 0.78, size * 0.45, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(size * 0.79, size * 0.45, size * 0.02, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.moveTo(size * 0.68, size * 0.38);
    ctx.lineTo(size * 0.65, size * 0.25);
    ctx.lineTo(size * 0.72, size * 0.38);
    ctx.closePath();
    ctx.fill();

    // Legs
    ctx.fillStyle = '#228B22';
    ctx.fillRect(size * 0.3, size * 0.85, size * 0.12, size * 0.15);
    ctx.fillRect(size * 0.55, size * 0.85, size * 0.12, size * 0.15);

    // Fire breath
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.moveTo(size * 0.95, size * 0.5);
    ctx.lineTo(size * 1.15, size * 0.45);
    ctx.lineTo(size * 1.1, size * 0.52);
    ctx.lineTo(size * 1.2, size * 0.52);
    ctx.lineTo(size * 1.1, size * 0.58);
    ctx.lineTo(size * 1.15, size * 0.6);
    ctx.lineTo(size * 0.95, size * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(size * 0.95, size * 0.5);
    ctx.lineTo(size * 1.05, size * 0.48);
    ctx.lineTo(size * 1.0, size * 0.52);
    ctx.lineTo(size * 1.08, size * 0.52);
    ctx.lineTo(size * 1.0, size * 0.56);
    ctx.lineTo(size * 1.05, size * 0.57);
    ctx.lineTo(size * 0.95, size * 0.55);
    ctx.closePath();
    ctx.fill();

    // Shadow under monster
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw tornado funnel
  drawTornado(ctx, screenX, screenY, scale, animFrame = 0) {
    const size = this.tileSize * scale * 2;

    ctx.save();
    ctx.translate(screenX - size / 4, screenY - size);

    // Funnel cloud at top
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.1, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main funnel - darker gray, twisted
    const wobble = Math.sin(animFrame * 0.3) * size * 0.05;

    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(size * 0.1, size * 0.15);
    ctx.quadraticCurveTo(size * 0.3 + wobble, size * 0.4, size * 0.4, size * 0.7);
    ctx.lineTo(size * 0.5, size * 1.1);
    ctx.lineTo(size * 0.6, size * 0.7);
    ctx.quadraticCurveTo(size * 0.7 - wobble, size * 0.4, size * 0.9, size * 0.15);
    ctx.closePath();
    ctx.fill();

    // Inner darker core
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.2);
    ctx.quadraticCurveTo(size * 0.4 + wobble * 0.5, size * 0.45, size * 0.45, size * 0.75);
    ctx.lineTo(size * 0.5, size * 1.0);
    ctx.lineTo(size * 0.55, size * 0.75);
    ctx.quadraticCurveTo(size * 0.6 - wobble * 0.5, size * 0.45, size * 0.75, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Debris particles
    ctx.fillStyle = '#654321';
    for (let i = 0; i < 8; i++) {
      const angle = (animFrame * 0.2 + i * Math.PI / 4);
      const radius = size * 0.15 + (i % 3) * size * 0.1;
      const height = size * 0.3 + i * size * 0.08;
      const px = size / 2 + Math.cos(angle) * radius;
      const py = height + Math.sin(angle) * size * 0.05;
      ctx.fillRect(px - 2, py - 2, 4, 4);
    }

    // Dust cloud at base
    ctx.fillStyle = 'rgba(139, 119, 101, 0.6)';
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 1.1, size * 0.35, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // More dust
    ctx.fillStyle = 'rgba(160, 140, 120, 0.4)';
    ctx.beginPath();
    ctx.ellipse(size * 0.3, size * 1.05, size * 0.2, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.7, size * 1.08, size * 0.22, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

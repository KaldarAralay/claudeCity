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

  // Draw a building tile based on type and density
  drawBuilding(ctx, type, density, x, y, width, height, isMainTile) {
    const colors = {
      residential: ['#90EE90', '#228B22', '#1C6B1C', '#155015', '#0E350E'],
      commercial: ['#87CEEB', '#4169E1', '#3157C4', '#2445A7', '#17338A'],
      industrial: ['#FFD700', '#DAA520', '#B8860B', '#8B6914', '#5E4C1D']
    };

    const colorSet = colors[type] || colors.residential;
    const buildingColor = colorSet[Math.min(density, colorSet.length - 1)];

    // Building base
    ctx.fillStyle = buildingColor;
    ctx.fillRect(1, 1, this.tileSize - 2, this.tileSize - 2);

    // Windows for developed buildings
    if (density >= 1) {
      ctx.fillStyle = '#FFE';
      const windowSize = 2;
      const gap = 4;
      for (let wy = 3; wy < this.tileSize - 3; wy += gap) {
        for (let wx = 3; wx < this.tileSize - 3; wx += gap) {
          ctx.fillRect(wx, wy, windowSize, windowSize);
        }
      }
    }

    // Roof line for higher density
    if (density >= 3) {
      ctx.fillStyle = '#333';
      ctx.fillRect(1, 1, this.tileSize - 2, 2);
    }
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
        tile.density,
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
}

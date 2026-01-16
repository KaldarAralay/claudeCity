// TileInfo.js - Tile information popup
// Shows detailed info when clicking on a tile with the pointer tool

class TileInfo {
  constructor(game) {
    this.game = game;
    this.popup = null;
    this.currentTile = null;
    this.createPopup();
  }

  // Create the popup element
  createPopup() {
    this.popup = document.createElement('div');
    this.popup.id = 'tile-info-popup';
    this.popup.className = 'tile-info-popup';
    this.popup.style.display = 'none';
    document.body.appendChild(this.popup);

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.popup.contains(e.target) && this.popup.style.display !== 'none') {
        // Small delay to prevent immediate close on the click that opened it
        setTimeout(() => this.hide(), 50);
      }
    });
  }

  // Show info for a tile at screen position
  show(tile, screenX, screenY) {
    if (!tile) {
      this.hide();
      return;
    }

    this.currentTile = tile;
    const info = this.getTileInfo(tile);

    this.popup.innerHTML = `
      <div class="tile-info-header">
        <span class="tile-info-title">${info.title}</span>
        <button class="tile-info-close" id="tile-info-close-btn">x</button>
      </div>
      <div class="tile-info-content">
        ${info.content}
      </div>
    `;

    // Position popup near the click but keep on screen
    const popupWidth = 200;
    const popupHeight = 150;
    let left = screenX + 20;
    let top = screenY - 20;

    // Keep on screen
    if (left + popupWidth > window.innerWidth) {
      left = screenX - popupWidth - 10;
    }
    if (top + popupHeight > window.innerHeight) {
      top = window.innerHeight - popupHeight - 10;
    }
    if (top < 0) top = 10;

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;
    this.popup.style.display = 'block';

    // Add close button handler
    this.popup.querySelector('#tile-info-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
  }

  // Hide the popup
  hide() {
    this.popup.style.display = 'none';
    this.currentTile = null;
  }

  // Get formatted info for a tile
  getTileInfo(tile) {
    const sim = this.game.simulation;
    let title = this.getTileTypeName(tile);
    let rows = [];

    // Coordinates
    rows.push({ label: 'Position', value: `(${tile.x}, ${tile.y})` });

    // Zone-specific info
    if (tile.isZone() || tile.isBuilding()) {
      if (tile.zoneType) {
        rows.push({ label: 'Zone Type', value: this.capitalizeFirst(tile.zoneType) });
      }

      if (tile.isBuilding() && tile.isMainTile) {
        rows.push({ label: 'Level', value: `${tile.level} / ${tile.getMaxLevel()}` });

        if (tile.zoneClass) {
          rows.push({ label: 'Class', value: this.capitalizeFirst(tile.zoneClass) });
        }

        if (tile.isResidential()) {
          rows.push({ label: 'Population', value: tile.population.toLocaleString() });
        } else {
          rows.push({ label: 'Jobs', value: tile.jobs.toLocaleString() });
        }
      }
    }

    // Power plant info
    if (tile.isPowerPlant()) {
      const plantType = tile.type === TILE_TYPES.COAL_POWER ? 'Coal' : 'Nuclear';
      const output = tile.type === TILE_TYPES.COAL_POWER ?
        POWER_OUTPUT.COAL : POWER_OUTPUT.NUCLEAR;
      rows.push({ label: 'Type', value: `${plantType} Power` });
      rows.push({ label: 'Output', value: `${output} MW` });
    }

    // Service building info
    if (tile.type === TILE_TYPES.POLICE || tile.type === TILE_TYPES.FIRE_STATION) {
      const serviceType = tile.type === TILE_TYPES.POLICE ? 'Police' : 'Fire';
      rows.push({ label: 'Service', value: `${serviceType} Station` });
      rows.push({ label: 'Coverage', value: 'Radius: 15 tiles' });
    }

    // Infrastructure
    if (tile.isRoad()) {
      rows.push({ label: 'Traffic', value: this.getTrafficLevel(tile.traffic) });
      if (tile.powerLineCrossover) {
        rows.push({ label: 'Power Line', value: 'Crossover' });
      }
    }

    if (tile.isRail()) {
      if (tile.powerLineCrossover) {
        rows.push({ label: 'Power Line', value: 'Crossover' });
      }
    }

    // Status indicators
    const statusIcons = [];
    if (tile.conductsPower() || tile.isPowerPlant()) {
      statusIcons.push(tile.powered ? '<span class="status-on">Powered</span>' : '<span class="status-off">No Power</span>');
    }
    if (tile.isZone() || tile.isBuilding()) {
      statusIcons.push(tile.roadAccess ? '<span class="status-on">Road Access</span>' : '<span class="status-off">No Road</span>');
    }

    // Land value, pollution, crime for developed tiles
    if (tile.isBuilding()) {
      const effectiveLV = tile.getEffectiveLandValue ? tile.getEffectiveLandValue() : tile.landValue;
      rows.push({ label: 'Land Value', value: this.getLevelText(effectiveLV, 255) });
      rows.push({ label: 'Pollution', value: this.getLevelText(tile.pollution, 255) });
      rows.push({ label: 'Crime', value: this.getLevelText(tile.crime, 255) });
    }

    // Build content HTML
    let content = '<div class="tile-info-rows">';
    for (const row of rows) {
      content += `<div class="tile-info-row">
        <span class="tile-info-label">${row.label}:</span>
        <span class="tile-info-value">${row.value}</span>
      </div>`;
    }
    content += '</div>';

    if (statusIcons.length > 0) {
      content += `<div class="tile-info-status">${statusIcons.join(' ')}</div>`;
    }

    return { title, content };
  }

  // Get human-readable tile type name
  getTileTypeName(tile) {
    if (tile.isBuilding()) {
      if (tile.isResidential()) return 'Residential Building';
      if (tile.isCommercial()) return 'Commercial Building';
      if (tile.isIndustrial()) return 'Industrial Building';
    }
    if (tile.isZone()) {
      if (tile.zoneType === 'residential') return 'Residential Zone';
      if (tile.zoneType === 'commercial') return 'Commercial Zone';
      if (tile.zoneType === 'industrial') return 'Industrial Zone';
    }

    switch (tile.type) {
      case TILE_TYPES.EMPTY: return 'Empty Land';
      case TILE_TYPES.WATER: return 'Water';
      case TILE_TYPES.FOREST: return 'Forest';
      case TILE_TYPES.RUBBLE: return 'Rubble';
      case TILE_TYPES.ROAD: return 'Road';
      case TILE_TYPES.RAIL: return 'Rail';
      case TILE_TYPES.POWER_LINE: return 'Power Line';
      case TILE_TYPES.PARK: return 'Park';
      case TILE_TYPES.COAL_POWER: return 'Coal Power Plant';
      case TILE_TYPES.NUCLEAR_POWER: return 'Nuclear Power Plant';
      case TILE_TYPES.POLICE: return 'Police Station';
      case TILE_TYPES.FIRE_STATION: return 'Fire Station';
      case TILE_TYPES.STADIUM: return 'Stadium';
      case TILE_TYPES.SEAPORT: return 'Seaport';
      case TILE_TYPES.AIRPORT: return 'Airport';
      case TILE_TYPES.NUCLEAR_WASTE: return 'Nuclear Waste';
      default: return 'Unknown';
    }
  }

  // Get traffic level description
  getTrafficLevel(traffic) {
    if (traffic < 30) return 'Light';
    if (traffic < 80) return 'Moderate';
    if (traffic < 150) return 'Heavy';
    return 'Congested';
  }

  // Get level text (Low/Medium/High/Very High)
  getLevelText(value, max) {
    const pct = value / max;
    if (pct < 0.15) return 'Very Low';
    if (pct < 0.35) return 'Low';
    if (pct < 0.55) return 'Medium';
    if (pct < 0.75) return 'High';
    return 'Very High';
  }

  // Capitalize first letter
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

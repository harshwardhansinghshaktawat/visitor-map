class D3WorldMapElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.mapLoaded = false;
    this.handleResize = this.handleResize.bind(this);
    this.activeTooltip = null;
    this.resizeTimeout = null;
    
    // Default style props
    this.styleProps = {
      bgColor1: '#667eea',
      bgColor2: '#764ba2',
      countryFill: '#ffffff',
      countryStroke: '#667eea',
      countryHover: '#f0f0f0',
      markerRecent: '#48bb78',
      markerOld: '#4299e1',
      markerStyle: 'pin',
      markerSize: 24,
      showPulse: true,
      showVisitCount: true,
      badgeBg: '#ffffff',
      badgeText: '#2d3748',
      showZoom: true,
      showStats: true,
      tooltipBg: '#1a202c',
      tooltipText: '#ffffff',
      showTooltip: true
    };
    
    console.log('✅ D3WorldMapElement: Constructor called');
  }

  connectedCallback() {
    console.log('✅ D3WorldMapElement: Connected to DOM');
    this.render();
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
  }

  static get observedAttributes() {
    return ['map-data', 'style-props'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!newValue || oldValue === newValue) return;
    
    if (name === 'style-props') {
      try {
        const newStyleProps = JSON.parse(newValue);
        this.styleProps = { ...this.styleProps, ...newStyleProps };
        console.log('🎨 Style props updated:', this.styleProps);
        
        if (this.mapLoaded) {
          this.updateStyles();
        }
      } catch (error) {
        console.error('Error parsing style props:', error);
      }
    } else if (name === 'map-data' && this.mapLoaded) {
      console.log('🔄 Map data changed, updating markers');
      this.updateMarkers();
    }
  }

  render() {
    console.log('🎨 Rendering D3 World Map');
    
    const styles = this.getStyles();
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="map-container">
        <div class="map-wrapper" id="mapWrapper">
          <div class="loading" id="loading">Loading world map...</div>
          <svg id="map">
            <defs>
              ${this.getMarkerDefs()}
            </defs>
          </svg>
          <div class="tooltip" id="tooltip"></div>
          
          <!-- Zoom Controls -->
          <div class="zoom-controls" id="zoomControls">
            <button class="zoom-btn" id="zoomIn" title="Zoom In">+</button>
            <button class="zoom-btn zoom-reset" id="zoomReset" title="Reset Zoom">⟲</button>
            <button class="zoom-btn" id="zoomOut" title="Zoom Out">−</button>
          </div>
        </div>
        
        <div class="bottom-stats" id="bottomStats">
          <div class="map-title">
            🌍 Live Visitor Map
          </div>
          
          <div class="stats-group">
            <div class="stat-card">
              <div class="stat-value" id="cityCount">0</div>
              <div class="stat-label">Cities</div>
            </div>
            
            <div class="stat-divider"></div>
            
            <div class="stat-card">
              <div class="stat-value" id="totalVisits">0</div>
              <div class="stat-label">Total Visits</div>
            </div>
            
            <div class="stat-divider"></div>
            
            <div class="stat-card">
              <div class="stat-value" id="recentCount">0</div>
              <div class="stat-label">Last 24 Hours</div>
            </div>
          </div>
          
          <div class="legend-group">
            <div class="legend-item">
              <div class="legend-icon">
                <svg width="16" height="20" viewBox="0 0 24 24">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                        fill="${this.styleProps.markerRecent}"/>
                </svg>
              </div>
              <span>Recent</span>
            </div>
            
            <div class="legend-item">
              <div class="legend-icon">
                <svg width="16" height="20" viewBox="0 0 24 24">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                        fill="${this.styleProps.markerOld}"/>
                </svg>
              </div>
              <span>Earlier</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Apply visibility settings
    this.updateVisibility();
    
    this.loadD3AndMap();
    this.setupZoomControls();
  }

  getStyles() {
    const { bgColor1, bgColor2, countryFill, countryStroke, countryHover, markerRecent, markerOld, badgeBg, badgeText, tooltipBg, tooltipText } = this.styleProps;
    
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 500px;
      }
      
      .map-container {
        width: 100%;
        height: 100%;
        min-height: 500px;
        position: relative;
        background: linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%);
        overflow: hidden;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
      }
      
      .map-wrapper {
        flex: 1;
        position: relative;
        overflow: hidden;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      
      #map {
        width: 100%;
        height: 100%;
        display: block;
        cursor: default;
        flex: 1;
        vertical-align: top;
        line-height: 0;
      }
      
      .country {
        fill: ${countryFill};
        stroke: ${countryStroke};
        stroke-width: 0.5;
        transition: fill 0.3s ease;
        opacity: 0.9;
        pointer-events: all;
      }
      
      .country:hover {
        fill: ${countryHover};
        opacity: 1;
      }
      
      .location-marker {
        cursor: pointer;
        transition: opacity 0.3s ease;
        transform-origin: center bottom;
        transform-box: fill-box;
        pointer-events: all;
      }
      
      .location-marker:hover {
        opacity: 0.8;
      }
      
      .marker-pin-recent {
        fill: ${markerRecent};
        filter: drop-shadow(0 4px 8px rgba(72, 187, 120, 0.5));
        pointer-events: all;
      }
      
      .marker-pin-old {
        fill: ${markerOld};
        filter: drop-shadow(0 4px 8px rgba(66, 153, 225, 0.5));
        pointer-events: all;
      }
      
      .marker-circle-recent {
        fill: ${markerRecent};
        stroke: ${markerRecent};
        stroke-width: 2;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      
      .marker-circle-old {
        fill: ${markerOld};
        stroke: ${markerOld};
        stroke-width: 2;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      
      .marker-square-recent {
        fill: ${markerRecent};
        stroke: white;
        stroke-width: 2;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      
      .marker-square-old {
        fill: ${markerOld};
        stroke: white;
        stroke-width: 2;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      
      .marker-star-recent {
        fill: ${markerRecent};
        stroke: white;
        stroke-width: 1.5;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      
      .marker-star-old {
        fill: ${markerOld};
        stroke: white;
        stroke-width: 1.5;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
      
      .marker-pulse {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        opacity: 0;
        transform-origin: center bottom;
        transform-box: fill-box;
        animation: pulse-ring 2s ease-out infinite;
        pointer-events: none;
      }
      
      @keyframes pulse-ring {
        0% {
          r: 4;
          opacity: 0.8;
        }
        100% {
          r: 20;
          opacity: 0;
        }
      }
      
      .visit-badge {
        pointer-events: all;
      }
      
      .visit-badge-bg {
        fill: ${badgeBg};
        stroke: ${badgeText};
        stroke-width: 1;
        pointer-events: all;
      }
      
      .visit-badge-text {
        fill: ${badgeText};
        font-size: 10px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        text-anchor: middle;
        dominant-baseline: middle;
        pointer-events: none;
      }
      
      .tooltip {
        position: absolute;
        background: ${tooltipBg};
        color: ${tooltipText};
        padding: 14px 18px;
        border-radius: 10px;
        font-size: 13px;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        white-space: nowrap;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        min-width: 200px;
        margin: 0;
        line-height: 1.4;
      }
      
      .tooltip.active {
        opacity: 1;
        transform: translateY(0);
      }
      
      .tooltip strong {
        display: block;
        font-size: 15px;
        margin-bottom: 6px;
        color: #63b3ed;
      }
      
      .tooltip-row {
        display: flex;
        justify-content: space-between;
        margin: 4px 0;
        font-size: 12px;
      }
      
      .tooltip-label {
        color: #a0aec0;
        margin-right: 12px;
      }
      
      .tooltip-value {
        color: #e2e8f0;
        font-weight: 600;
      }
      
      .tooltip-highlight {
        background: rgba(72, 187, 120, 0.2);
        padding: 4px 10px;
        border-radius: 6px;
        margin-top: 6px;
        text-align: center;
        color: #9ae6b4;
        font-weight: 600;
      }
      
      .zoom-controls {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 100;
      }
      
      .zoom-btn {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: bold;
        color: #667eea;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        user-select: none;
      }
      
      .zoom-btn:hover {
        background: white;
        border-color: #667eea;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .zoom-btn:active {
        transform: scale(0.95);
      }
      
      .zoom-reset {
        font-size: 16px;
        padding: 8px;
        height: auto;
      }
      
      .bottom-stats {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
        padding: 16px 24px;
        display: flex;
        justify-content: space-around;
        align-items: center;
        gap: 20px;
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      
      .stats-group {
        display: flex;
        gap: 32px;
        align-items: center;
        flex: 1;
        justify-content: center;
      }
      
      .stat-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        min-width: 100px;
      }
      
      .stat-label {
        color: #718096;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .stat-value {
        font-size: 28px;
        font-weight: 800;
        background: linear-gradient(135deg, ${bgColor1}, ${bgColor2});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
      }
      
      .stat-divider {
        width: 1px;
        height: 40px;
        background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.1), rgba(0,0,0,0));
      }
      
      .legend-group {
        display: flex;
        gap: 24px;
        align-items: center;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 500;
        color: #4a5568;
      }
      
      .legend-icon {
        width: 16px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .map-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: #2d3748;
      }
      
      .loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        color: white;
        font-size: 18px;
        font-weight: 600;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        margin: 0;
        padding: 0;
        line-height: 1;
      }
      
      /* Responsive Design */
      @media (max-width: 1024px) {
        .bottom-stats {
          padding: 12px 16px;
        }
        
        .stats-group {
          gap: 20px;
        }
        
        .stat-card {
          min-width: 80px;
        }
        
        .stat-value {
          font-size: 24px;
        }
        
        .stat-label {
          font-size: 11px;
        }
        
        .zoom-controls {
          top: 12px;
          right: 12px;
        }
        
        .zoom-btn {
          width: 36px;
          height: 36px;
          font-size: 18px;
        }
      }
      
      @media (max-width: 768px) {
        :host {
          min-height: 400px;
        }
        
        .map-container {
          min-height: 400px;
          border-radius: 8px;
        }
        
        .bottom-stats {
          flex-direction: column;
          padding: 12px;
          gap: 12px;
        }
        
        .stats-group {
          width: 100%;
          gap: 16px;
        }
        
        .stat-divider {
          display: none;
        }
        
        .legend-group {
          width: 100%;
          justify-content: center;
          padding-top: 8px;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        
        .stat-card {
          min-width: 70px;
        }
        
        .stat-value {
          font-size: 20px;
        }
        
        .map-title {
          display: none;
        }
        
        .zoom-controls {
          top: 8px;
          right: 8px;
          gap: 6px;
        }
        
        .zoom-btn {
          width: 32px;
          height: 32px;
          font-size: 16px;
        }
        
        .tooltip {
          font-size: 11px;
          padding: 10px 14px;
          min-width: 180px;
        }
        
        .tooltip strong {
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        :host {
          min-height: 350px;
        }
        
        .map-container {
          min-height: 350px;
          border-radius: 6px;
        }
        
        .stat-value {
          font-size: 18px;
        }
        
        .stat-label {
          font-size: 10px;
        }
        
        .stat-card {
          min-width: 60px;
        }
        
        .zoom-controls {
          top: 6px;
          right: 6px;
        }
        
        .zoom-btn {
          width: 28px;
          height: 28px;
          font-size: 14px;
        }
      }
    `;
  }

  getMarkerDefs() {
    const { markerRecent, markerOld, markerStyle, markerSize } = this.styleProps;
    
    if (markerStyle === 'pin') {
      return `
        <!-- Location Pin Icon - Recent (Green) -->
        <g id="pin-recent">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                class="marker-pin-recent"/>
        </g>
        
        <!-- Location Pin Icon - Old (Blue) -->
        <g id="pin-old">
          <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                class="marker-pin-old"/>
        </g>
      `;
    } else if (markerStyle === 'circle') {
      return `
        <g id="circle-recent">
          <circle cx="0" cy="0" r="${markerSize / 2}" class="marker-circle-recent"/>
        </g>
        <g id="circle-old">
          <circle cx="0" cy="0" r="${markerSize / 2}" class="marker-circle-old"/>
        </g>
      `;
    } else if (markerStyle === 'square') {
      const size = markerSize;
      return `
        <g id="square-recent">
          <rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" class="marker-square-recent"/>
        </g>
        <g id="square-old">
          <rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" class="marker-square-old"/>
        </g>
      `;
    } else if (markerStyle === 'star') {
      return `
        <g id="star-recent">
          <path d="M12,2 L14.5,9.5 L22,10.5 L16.5,15.5 L18,23 L12,19 L6,23 L7.5,15.5 L2,10.5 L9.5,9.5 Z" 
                class="marker-star-recent" transform="translate(-12, -12)"/>
        </g>
        <g id="star-old">
          <path d="M12,2 L14.5,9.5 L22,10.5 L16.5,15.5 L18,23 L12,19 L6,23 L7.5,15.5 L2,10.5 L9.5,9.5 Z" 
                class="marker-star-old" transform="translate(-12, -12)"/>
        </g>
      `;
    }
    
    return '';
  }

  updateVisibility() {
    const { showZoom, showStats, showTooltip } = this.styleProps;
    
    const zoomControls = this.shadowRoot.getElementById('zoomControls');
    const bottomStats = this.shadowRoot.getElementById('bottomStats');
    const tooltip = this.shadowRoot.getElementById('tooltip');
    
    if (zoomControls) {
      zoomControls.style.display = showZoom ? 'flex' : 'none';
    }
    
    if (bottomStats) {
      bottomStats.style.display = showStats ? 'flex' : 'none';
    }
    
    if (tooltip && !showTooltip) {
      tooltip.style.display = 'none';
    }
  }

  updateStyles() {
    console.log('🎨 Updating map styles...');
    
    // Re-render to apply new styles
    const mapData = this.getAttribute('map-data');
    this.render();
    
    // Reload map with new styles
    if (this.mapLoaded && mapData) {
      this.loadD3AndMap();
    }
  }

  setupZoomControls() {
    const zoomIn = this.shadowRoot.getElementById('zoomIn');
    const zoomOut = this.shadowRoot.getElementById('zoomOut');
    const zoomReset = this.shadowRoot.getElementById('zoomReset');
    
    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        if (!this.zoom) return;
        const svg = window.d3.select(this.shadowRoot.getElementById('map'));
        svg.transition().duration(300).call(this.zoom.scaleBy, 1.5);
      });
    }
    
    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        if (!this.zoom) return;
        const svg = window.d3.select(this.shadowRoot.getElementById('map'));
        svg.transition().duration(300).call(this.zoom.scaleBy, 0.67);
      });
    }
    
    if (zoomReset) {
      zoomReset.addEventListener('click', () => {
        if (!this.zoom) return;
        const svg = window.d3.select(this.shadowRoot.getElementById('map'));
        svg.transition().duration(500).call(
          this.zoom.transform,
          window.d3.zoomIdentity
        );
      });
    }
  }

  async loadD3AndMap() {
    try {
      console.log('📦 Loading D3.js libraries...');
      
      if (!window.d3) {
        await this.loadScript('https://d3js.org/d3.v7.min.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!window.d3) {
        throw new Error('D3.js failed to load');
      }
      console.log('✅ D3.js loaded');
      
      if (!window.topojson) {
        await this.loadScript('https://unpkg.com/topojson@3');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!window.topojson) {
        throw new Error('TopoJSON failed to load');
      }
      console.log('✅ TopoJSON loaded');
      
      await this.initializeMap();
      window.addEventListener('resize', this.handleResize);
      
    } catch (error) {
      console.error('❌ Error loading libraries:', error);
      this.shadowRoot.getElementById('loading').textContent = 'Error loading map';
    }
  }

  handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      if (!this.mapLoaded) return;
      
      console.log('🔄 Handling resize...');
      
      const mapWrapper = this.shadowRoot.getElementById('mapWrapper');
      const svg = window.d3.select(this.shadowRoot.getElementById('map'));
      
      const width = mapWrapper.clientWidth;
      const height = mapWrapper.clientHeight;
      
      console.log('📐 New dimensions:', width, 'x', height);
      
      if (width === 0 || height === 0) {
        console.log('⚠️ Invalid dimensions, skipping resize');
        return;
      }
      
      svg
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);
      
      const scale = Math.min(width / 5, height / 2.8);
      
      this.projection
        .scale(scale)
        .translate([width / 2, height / 2]);
      
      svg.selectAll('.country').attr('d', this.path);
      
      if (this.zoom) {
        svg.call(this.zoom.transform, window.d3.zoomIdentity);
      }
      
      if (this.getAttribute('map-data')) {
        this.updateMarkers();
      }
      
      console.log('✅ Resize complete');
    }, 250);
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (src.includes('d3.v7') && window.d3) {
        resolve();
        return;
      }
      if (src.includes('topojson') && window.topojson) {
        resolve();
        return;
      }
      
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        console.log(`✅ Script loaded: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  async initializeMap() {
    console.log('🗺️ Initializing D3 map...');
    
    const mapWrapper = this.shadowRoot.getElementById('mapWrapper');
    const svg = window.d3.select(this.shadowRoot.getElementById('map'));
    const loading = this.shadowRoot.getElementById('loading');
    
    const width = mapWrapper.clientWidth || 1000;
    const height = mapWrapper.clientHeight || 600;
    
    console.log('📐 Initial map dimensions:', width, 'x', height);
    
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    const scale = Math.min(width / 5, height / 2.8);
    
    this.projection = window.d3.geoNaturalEarth1()
      .scale(scale)
      .translate([width / 2, height / 2]);
    
    this.path = window.d3.geoPath().projection(this.projection);
    
    this.zoom = window.d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        if (event.transform.k < 1) {
          event.transform.k = 1;
        }
        svg.selectAll('.countries').attr('transform', event.transform);
        svg.selectAll('.markers').attr('transform', event.transform);
      });
    
    svg.call(this.zoom);
    
    try {
      console.log('📥 Fetching world map data...');
      const worldData = await window.d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      console.log('✅ World data loaded');
      
      const countries = window.topojson.feature(worldData, worldData.objects.countries);
      
      svg.append('g')
        .attr('class', 'countries')
        .selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', this.path);
      
      this.markersGroup = svg.append('g').attr('class', 'markers');
      
      loading.style.display = 'none';
      this.mapLoaded = true;
      
      const mapData = this.getAttribute('map-data');
      if (mapData) {
        console.log('📍 Initial map data found, rendering markers');
        this.updateMarkers();
      }
      
    } catch (error) {
      console.error('❌ Error loading map data:', error);
      loading.textContent = 'Error loading map data';
    }
  }

  updateMarkers() {
    if (!this.mapLoaded) {
      console.log('⏳ Map not loaded yet');
      return;
    }
    
    const mapData = this.getAttribute('map-data');
    if (!mapData) {
      console.log('⚠️ No map data attribute');
      return;
    }
    
    try {
      const locations = JSON.parse(mapData);
      console.log('\n========== UPDATING CITY-LEVEL MARKERS ==========');
      console.log('📍 Total cities:', locations.length);
      
      if (locations.length === 0) {
        console.log('⚠️ No locations to display');
        return;
      }
      
      const tooltip = this.shadowRoot.getElementById('tooltip');
      const mapWrapper = this.shadowRoot.getElementById('mapWrapper');
      
      this.markersGroup.selectAll('*').remove();
      console.log('🧹 Cleared old markers');
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      let recentCount = 0;
      let totalVisits = 0;
      const countries = new Set();
      
      const { markerStyle, markerSize, showPulse, showVisitCount, markerRecent, showTooltip } = this.styleProps;
      
      locations.forEach((location, index) => {
        if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
          console.error(`❌ Invalid location ${index}:`, location);
          return;
        }
        if (isNaN(location.lat) || isNaN(location.lng)) {
          console.error(`❌ NaN in location ${index}:`, location);
          return;
        }
        
        const coords = this.projection([location.lng, location.lat]);
        if (!coords) {
          console.error(`❌ Projection failed for location ${index}:`, location);
          return;
        }
        
        const [x, y] = coords;
        const isRecent = location.isRecent;
        
        if (isRecent) recentCount++;
        totalVisits += location.totalVisits || 0;
        if (location.country) countries.add(location.country);
        
        const markerGroup = this.markersGroup.append('g')
          .attr('class', 'location-marker')
          .attr('transform', `translate(${x}, ${y})`);
        
        // Add pulse animation for recent visitors
        if (isRecent && showPulse) {
          const pulseY = markerStyle === 'pin' ? -10 : 0;
          markerGroup.append('circle')
            .attr('cx', 0)
            .attr('cy', pulseY)
            .attr('r', 4)
            .attr('class', 'marker-pulse')
            .style('color', markerRecent);
        }
        
        // Add marker based on style
        this.addMarker(markerGroup, isRecent, markerStyle, markerSize);
        
        // Add visit count badge
        if (showVisitCount && location.totalVisits > 1) {
          const badgeY = markerStyle === 'pin' ? -20 : -(markerSize / 2) - 5;
          const badge = markerGroup.append('g')
            .attr('class', 'visit-badge')
            .attr('transform', `translate(8, ${badgeY})`);
          
          badge.append('circle')
            .attr('class', 'visit-badge-bg')
            .attr('r', 12)
            .style('opacity', 0)
            .style('pointer-events', 'all');
          
          badge.append('circle')
            .attr('class', 'visit-badge-bg')
            .attr('r', 10);
          
          badge.append('text')
            .attr('class', 'visit-badge-text')
            .text(location.totalVisits > 99 ? '99+' : location.totalVisits);
        }
        
        // Tooltip events
        if (showTooltip) {
          let enterTimeout;
          let leaveTimeout;
          
          markerGroup.on('mouseenter', () => {
            clearTimeout(leaveTimeout);
            clearTimeout(enterTimeout);
            
            enterTimeout = setTimeout(() => {
              this.activeTooltip = index;
              tooltip.innerHTML = `
                <strong>📍 ${location.title || 'Visitor Location'}</strong>
                <div class="tooltip-row">
                  <span class="tooltip-label">Total Visits:</span>
                  <span class="tooltip-value">${location.totalVisits || 1}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">Unique Visitors:</span>
                  <span class="tooltip-value">${location.visitorCount || 1}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">Last Visit:</span>
                  <span class="tooltip-value">${location.lastVisit || 'Unknown'}</span>
                </div>
                ${isRecent ? '<div class="tooltip-highlight">🟢 Active in last 24h</div>' : ''}
              `;
              tooltip.classList.add('active');
            }, 100);
          });
          
          markerGroup.on('mousemove', (event) => {
            if (this.activeTooltip !== index) return;
            
            const rect = mapWrapper.getBoundingClientRect();
            const left = event.clientX - rect.left;
            const top = event.clientY - rect.top;
            
            const tooltipWidth = 220;
            const tooltipHeight = 140;
            
            let finalLeft = left + 15;
            let finalTop = top + 15;
            
            if (finalLeft + tooltipWidth > rect.width) {
              finalLeft = left - tooltipWidth - 15;
            }
            if (finalTop + tooltipHeight > rect.height) {
              finalTop = top - tooltipHeight - 15;
            }
            
            tooltip.style.left = `${finalLeft}px`;
            tooltip.style.top = `${finalTop}px`;
          });
          
          markerGroup.on('mouseleave', () => {
            clearTimeout(enterTimeout);
            clearTimeout(leaveTimeout);
            
            leaveTimeout = setTimeout(() => {
              if (this.activeTooltip === index) {
                tooltip.classList.remove('active');
                this.activeTooltip = null;
              }
            }, 100);
          });
        }
      });
      
      console.log('\n📊 STATISTICS');
      console.log('Cities:', locations.length);
      console.log('Total Visits:', totalVisits);
      console.log('Recent (24h):', recentCount);
      console.log('Countries:', countries.size);
      console.log('======================================\n');
      
      this.shadowRoot.getElementById('cityCount').textContent = locations.length;
      this.shadowRoot.getElementById('totalVisits').textContent = totalVisits;
      this.shadowRoot.getElementById('recentCount').textContent = recentCount;
      
    } catch (error) {
      console.error('❌ Error updating markers:', error);
    }
  }

  addMarker(markerGroup, isRecent, style, size) {
    const markerType = isRecent ? 'recent' : 'old';
    
    if (style === 'pin') {
      markerGroup.append('use')
        .attr('href', `#pin-${markerType}`)
        .attr('x', -12)
        .attr('y', -24)
        .attr('width', 24)
        .attr('height', 24);
    } else if (style === 'circle') {
      markerGroup.append('use')
        .attr('href', `#circle-${markerType}`)
        .attr('x', 0)
        .attr('y', 0);
    } else if (style === 'square') {
      markerGroup.append('use')
        .attr('href', `#square-${markerType}`)
        .attr('x', 0)
        .attr('y', 0);
    } else if (style === 'star') {
      markerGroup.append('use')
        .attr('href', `#star-${markerType}`)
        .attr('x', 0)
        .attr('y', 0);
    }
  }
}

customElements.define('d3-world-map-element', D3WorldMapElement);
console.log('✅ d3-world-map-element registered');

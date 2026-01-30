class D3GlobeElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.globe = null;
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this); // New listener for tooltip
    this.resizeTimeout = null;
    this.initialRenderDone = false;
    this.autoRotate = true;
    this.countriesData = null;
    this.tooltipActive = false; // Track tooltip state
    
    // Parse initial style props
    const initialStyleProps = this.getAttribute('style-props');
    this.styleProps = initialStyleProps ? JSON.parse(initialStyleProps) : this.getDefaultStyleProps();
  }

  getDefaultStyleProps() {
    return {
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
      tooltipTitleColor: '#63b3ed',
      tooltipLabelColor: '#a0aec0',
      tooltipValueColor: '#e2e8f0',
      tooltipHighlightColor: '#9ae6b4',
      showTooltip: true,
      titleColor: '#2d3748',
      statsValueColor: '#667eea',
      statsLabelColor: '#718096',
      statsBgColor: '#ffffff',
      legendTextColor: '#4a5568',
      language: 'en'
    };
  }

  connectedCallback() {
    setTimeout(() => {
      const stylePropsAttr = this.getAttribute('style-props');
      if (stylePropsAttr) {
        this.styleProps = JSON.parse(stylePropsAttr);
      }
      this.render();
    }, 50);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
    const wrapper = this.shadowRoot.getElementById('globeWrapper');
    if (wrapper) wrapper.removeEventListener('mousemove', this.handleMouseMove);
    
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    if (this.globe) {
      this.globe._destructor();
    }
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
        if (this.initialRenderDone && this.globe) {
          this.updateGlobeStyles();
        }
      } catch (error) {
        console.error('Error parsing style props:', error);
      }
    } else if (name === 'map-data' && this.globe) {
      this.updateMarkers();
    }
  }

  getTranslations() {
    const translations = {
      en: { mapTitle: '🌍 Live Visitor Globe', cities: 'Cities', totalVisits: 'Total Visits', last24Hours: 'Last 24 Hours', recent: 'Recent', earlier: 'Earlier', loading: 'Loading 3D Globe...' },
      es: { mapTitle: '🌍 Globo de Visitantes', cities: 'Ciudades', totalVisits: 'Visitas', last24Hours: '24 Horas', recent: 'Reciente', earlier: 'Anterior', loading: 'Cargando...' },
      // ... (Using EN fallback for brevity in fix, full list can be re-added)
    };
    const lang = this.styleProps.language || 'en';
    return translations[lang] || translations.en;
  }

  render() {
    const styles = this.getStyles();
    const t = this.getTranslations();
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="globe-container">
        <div class="globe-wrapper" id="globeWrapper">
          <div class="loading" id="loading">${t.loading}</div>
          <div id="globeViz"></div>
          
          <div id="globalTooltip" class="global-tooltip"></div>
          
          <div class="controls-overlay">
            <div class="control-btn active" id="autoRotateBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
            </div>
            <div class="control-btn" id="resetViewBtn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
            </div>
          </div>
          
          <div class="zoom-controls" id="zoomControls">
            <button class="zoom-btn" id="zoomIn">+</button>
            <button class="zoom-btn" id="zoomOut">−</button>
          </div>
        </div>
        
        <div class="bottom-stats" id="bottomStats">
          <div class="map-title">${t.mapTitle}</div>
          <div class="stats-group">
            <div class="stat-card"><div class="stat-value" id="cityCount">0</div><div class="stat-label">${t.cities}</div></div>
            <div class="stat-divider"></div>
            <div class="stat-card"><div class="stat-value" id="totalVisits">0</div><div class="stat-label">${t.totalVisits}</div></div>
            <div class="stat-divider"></div>
            <div class="stat-card"><div class="stat-value" id="recentCount">0</div><div class="stat-label">${t.last24Hours}</div></div>
          </div>
          <div class="legend-group">
            <div class="legend-item">
              <div class="legend-icon"><svg width="16" height="20"><path d="M8 0C4 0 0 4 0 8c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z" fill="${this.styleProps.markerRecent}"/></svg></div>
              <span>${t.recent}</span>
            </div>
            <div class="legend-item">
              <div class="legend-icon"><svg width="16" height="20"><path d="M8 0C4 0 0 4 0 8c0 6 8 12 8 12s8-6 8-12c0-4-4-8-8-8z" fill="${this.styleProps.markerOld}"/></svg></div>
              <span>${t.earlier}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.initialRenderDone = true;
    this.updateVisibility();
    this.loadGlobeLibrary();
    this.setupControls();
    
    // Bind mousemove for global tooltip
    this.shadowRoot.getElementById('globeWrapper').addEventListener('mousemove', this.handleMouseMove);
  }

  // --- NEW TOOLTIP HANDLER ---
  handleMouseMove(e) {
    if (!this.tooltipActive) return;
    
    const tooltip = this.shadowRoot.getElementById('globalTooltip');
    const wrapperRect = this.shadowRoot.getElementById('globeWrapper').getBoundingClientRect();
    
    // Calculate relative position within the wrapper
    const x = e.clientX - wrapperRect.left;
    const y = e.clientY - wrapperRect.top;
    
    // Add offset so it doesn't cover cursor
    tooltip.style.transform = `translate(${x + 15}px, ${y - 40}px)`;
  }

  getStyles() {
    const s = this.styleProps;
    return `
      :host { display: block; width: 100%; height: 100%; min-height: 500px; }
      .globe-container { width: 100%; height: 100%; position: relative; background: linear-gradient(135deg, ${s.bgColor1}, ${s.bgColor2}); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
      .globe-wrapper { flex: 1; position: relative; overflow: hidden; cursor: grab; }
      .globe-wrapper:active { cursor: grabbing; }
      #globeViz { width: 100%; height: 100%; }
      
      /* GLOBAL TOOLTIP STYLE */
      .global-tooltip {
        position: absolute;
        top: 0;
        left: 0;
        background: ${s.tooltipBg};
        color: white;
        padding: 10px 14px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        pointer-events: none; /* Crucial for performance */
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        min-width: 150px;
        will-change: transform; /* Hint for browser optimization */
      }
      .global-tooltip.visible { opacity: 1; }
      
      .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: 600; pointer-events: none; }
      .controls-overlay { position: absolute; top: 20px; left: 20px; display: flex; gap: 10px; z-index: 10; }
      .control-btn { width: 40px; height: 40px; background: rgba(255,255,255,0.9); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #667eea; transition: 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .control-btn:hover { background: white; transform: scale(1.05); }
      .control-btn.active { background: #667eea; color: white; }
      .zoom-controls { position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
      .zoom-btn { width: 36px; height: 36px; background: rgba(255,255,255,0.9); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #667eea; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .zoom-btn:hover { background: white; }
      
      .bottom-stats { background: ${s.statsBgColor}; padding: 15px; display: flex; justify-content: space-around; align-items: center; font-family: system-ui; border-top: 1px solid rgba(255,255,255,0.2); }
      .stats-group { display: flex; gap: 25px; }
      .stat-card { text-align: center; }
      .stat-value { font-size: 24px; font-weight: 800; color: ${s.statsValueColor}; line-height: 1; }
      .stat-label { font-size: 11px; font-weight: 600; color: ${s.statsLabelColor}; text-transform: uppercase; margin-top: 4px; }
      .stat-divider { width: 1px; height: 35px; background: rgba(0,0,0,0.1); }
      .legend-group { display: flex; gap: 15px; font-size: 12px; color: ${s.legendTextColor}; }
      .legend-item { display: flex; align-items: center; gap: 6px; }
      .map-title { font-weight: 700; color: ${s.titleColor}; font-size: 14px; }
      
      @media (max-width: 768px) {
        .bottom-stats { flex-direction: column; gap: 15px; }
        .map-title { display: none; }
        .stats-group { width: 100%; justify-content: space-between; }
        .stat-divider { display: none; }
      }
    `;
  }

  updateVisibility() {
    const { showZoom, showStats } = this.styleProps;
    const zoomControls = this.shadowRoot.getElementById('zoomControls');
    const bottomStats = this.shadowRoot.getElementById('bottomStats');
    if (zoomControls) zoomControls.style.display = showZoom ? 'flex' : 'none';
    if (bottomStats) bottomStats.style.display = showStats ? 'flex' : 'none';
  }

  updateGlobeStyles() {
    if (!this.globe) return;
    const { countryFill, countryStroke, bgColor1 } = this.styleProps;
    
    this.globe
      .backgroundColor(bgColor1)
      .globeMaterial(new window.THREE.MeshPhongMaterial({
        color: bgColor1, emissive: bgColor1, emissiveIntensity: 0.1, shininess: 0.7
      }))
      .atmosphereColor(countryStroke)
      
    if (this.countriesData) {
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => countryFill)
        .polygonSideColor(() => 'rgba(0,0,0,0.05)')
        .polygonStrokeColor(() => countryStroke)
        .polygonAltitude(0.01);
    }
    
    this.updateMarkers();
  }

  setupControls() {
    const autoRotateBtn = this.shadowRoot.getElementById('autoRotateBtn');
    const resetViewBtn = this.shadowRoot.getElementById('resetViewBtn');
    const zoomIn = this.shadowRoot.getElementById('zoomIn');
    const zoomOut = this.shadowRoot.getElementById('zoomOut');
    
    autoRotateBtn?.addEventListener('click', () => {
      if (!this.globe) return;
      this.autoRotate = !this.autoRotate;
      this.globe.controls().autoRotate = this.autoRotate;
      autoRotateBtn.classList.toggle('active', this.autoRotate);
    });
    
    resetViewBtn?.addEventListener('click', () => {
      this.globe?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
    });
    
    zoomIn?.addEventListener('click', () => {
      const pov = this.globe?.pointOfView();
      if(pov) this.globe.pointOfView({ ...pov, altitude: Math.max(pov.altitude - 0.5, 1) }, 300);
    });
    
    zoomOut?.addEventListener('click', () => {
      const pov = this.globe?.pointOfView();
      if(pov) this.globe.pointOfView({ ...pov, altitude: Math.min(pov.altitude + 0.5, 4) }, 300);
    });
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async loadGlobeLibrary() {
    try {
      // Parallel loading for speed, but ThreeJS must be before Globe
      if (!window.THREE) await this.loadScript('https://unpkg.com/three@0.160.0/build/three.min.js');
      
      await Promise.all([
        !window.topojson ? this.loadScript('https://unpkg.com/topojson@3') : Promise.resolve(),
        !window.Globe ? this.loadScript('//unpkg.com/globe.gl') : Promise.resolve()
      ]);
      
      this.initializeGlobe();
      window.addEventListener('resize', this.handleResize);
    } catch (error) {
      console.error('Lib load error:', error);
      this.shadowRoot.getElementById('loading').textContent = 'Error loading components';
    }
  }

  handleResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      if (!this.globe) return;
      const container = this.shadowRoot.getElementById('globeViz');
      this.globe.width(container.clientWidth).height(container.clientHeight);
    }, 200);
  }

  async initializeGlobe() {
    const container = this.shadowRoot.getElementById('globeViz');
    const { bgColor1, countryFill, countryStroke } = this.styleProps;
    
    // Performance: Create Globe with cleaner renderer config
    this.globe = window.Globe({ 
      animateIn: true, 
      rendererConfig: { antialias: true, alpha: true, powerPreference: "high-performance" } 
    })(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundColor(bgColor1 || '#667eea')
      .globeMaterial(new window.THREE.MeshPhongMaterial({
        color: bgColor1, emissive: bgColor1, emissiveIntensity: 0.1, shininess: 0.7
      }))
      .atmosphereColor(countryStroke)
      .atmosphereAltitude(0.15)
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    // PERFORMANCE FIX: Disable html transition so markers don't float/lag
    this.globe.htmlTransitionDuration(0);

    this.globe.controls().autoRotate = true;
    this.globe.controls().autoRotateSpeed = 0.5;
    this.globe.controls().enableZoom = true;

    try {
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
      const worldData = await response.json();
      this.countriesData = window.topojson.feature(worldData, worldData.objects.countries);
      
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => countryFill || '#ffffff')
        .polygonSideColor(() => 'rgba(0,0,0,0.05)')
        .polygonStrokeColor(() => countryStroke || '#667eea')
        .polygonAltitude(0.01);
      
      this.shadowRoot.getElementById('loading').style.display = 'none';
      
      const mapData = this.getAttribute('map-data');
      if (mapData) this.updateMarkers();
      
    } catch (error) {
      console.error('Data load error:', error);
    }
  }

  updateMarkers() {
    if (!this.globe) return;
    const mapData = this.getAttribute('map-data');
    if (!mapData) return;

    try {
      const locations = JSON.parse(mapData);
      const { markerRecent, markerOld, markerSize, showPulse, showVisitCount, badgeBg, badgeText } = this.styleProps;
      const tooltipEl = this.shadowRoot.getElementById('globalTooltip');
      const tooltipBg = this.styleProps.tooltipBg;
      const tooltipTitleColor = this.styleProps.tooltipTitleColor;
      const tooltipValueColor = this.styleProps.tooltipValueColor;

      // Stats calculation
      let recent = 0;
      let total = 0;
      locations.forEach(l => {
        if(l.isRecent) recent++;
        total += (l.totalVisits || 1);
      });
      
      this.shadowRoot.getElementById('cityCount').innerText = locations.length;
      this.shadowRoot.getElementById('totalVisits').innerText = total;
      this.shadowRoot.getElementById('recentCount').innerText = recent;

      // --- RENDERING MARKERS ---
      this.globe
        .htmlElementsData(locations)
        .htmlLat(d => d.lat)
        .htmlLng(d => d.lng)
        .htmlAltitude(0.01) // Keep close to surface
        .htmlElement(d => {
          const el = document.createElement('div');
          // Important: pointer-events auto allows hovering the marker
          el.style.cssText = 'cursor: pointer; pointer-events: auto; transform: translate(-50%, -100%);'; 
          
          const color = d.isRecent ? markerRecent : markerOld;
          const size = markerSize || 24;
          
          // Simple marker structure (SVG)
          el.innerHTML = `
            <div style="width: ${size}px; height: ${size}px; position: relative;">
               <svg viewBox="0 0 24 34" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                 <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8z" fill="${color}"/>
               </svg>
               ${showVisitCount && d.totalVisits > 1 ? `
                 <div style="position: absolute; top: -5px; right: -5px; background: ${badgeBg}; color: ${badgeText}; 
                   border-radius: 50%; width: 16px; height: 16px; font-size: 9px; display: flex; 
                   align-items: center; justify-content: center; font-weight: bold; border: 1px solid ${color};">
                   ${d.totalVisits > 99 ? '99+' : d.totalVisits}
                 </div>
               ` : ''}
            </div>
          `;

          // --- EVENT LISTENERS FOR GLOBAL TOOLTIP ---
          // We do NOT append tooltip to 'el'. We update the global tooltip.
          el.addEventListener('mouseenter', () => {
            this.tooltipActive = true;
            tooltipEl.classList.add('visible');
            
            // Update Global Tooltip Content
            tooltipEl.innerHTML = `
              <div style="font-weight: 700; color: ${tooltipTitleColor}; margin-bottom: 4px;">📍 ${d.title || 'Unknown'}</div>
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <span style="color: #a0aec0;">Visits:</span>
                <span style="color: ${tooltipValueColor}; font-weight:600;">${d.totalVisits || 1}</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color: #a0aec0;">Last:</span>
                <span style="color: ${tooltipValueColor}; font-weight:600;">${d.lastVisit || 'Just now'}</span>
              </div>
              ${d.isRecent ? `<div style="margin-top:6px; font-size:10px; text-align:center; background:rgba(72,187,120,0.2); color:#68d391; padding:2px; border-radius:4px;">🟢 Active Now</div>` : ''}
            `;
          });

          el.addEventListener('mouseleave', () => {
            this.tooltipActive = false;
            tooltipEl.classList.remove('visible');
          });

          return el;
        });

      // Rings (Pulse)
      if (showPulse) {
        this.globe
          .ringsData(locations.filter(l => l.isRecent))
          .ringColor(() => markerRecent)
          .ringMaxRadius(5)
          .ringPropagationSpeed(3)
          .ringRepeatPeriod(1200);
      } else {
        this.globe.ringsData([]);
      }

    } catch (e) {
      console.error('Marker update error', e);
    }
  }
}

customElements.define('d3-globe-element', D3GlobeElement);
console.log('✅ d3-globe-element registered (Performance Optimized)');

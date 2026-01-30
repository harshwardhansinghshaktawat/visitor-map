class D3GlobeElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.globe = null;
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.resizeTimeout = null;
    this.initialRenderDone = false;
    this.autoRotate = true;
    this.countriesData = null;
    this.tooltipActive = false;
    
    const initialStyleProps = this.getAttribute('style-props');
    this.styleProps = initialStyleProps ? JSON.parse(initialStyleProps) : this.getDefaultStyleProps();
  }

  getDefaultStyleProps() {
    return {
      bgColor1: '#667eea',
      bgColor2: '#764ba2',
      countryFill: '#ffffff',
      countryStroke: '#667eea',
      markerRecent: '#48bb78',
      markerOld: '#4299e1',
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
      if (stylePropsAttr) this.styleProps = JSON.parse(stylePropsAttr);
      this.render();
    }, 50);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize);
    const wrapper = this.shadowRoot.getElementById('globeWrapper');
    if (wrapper) wrapper.removeEventListener('mousemove', this.handleMouseMove);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    if (this.globe) this.globe._destructor();
  }

  static get observedAttributes() { return ['map-data', 'style-props']; }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!newValue || oldValue === newValue) return;
    if (name === 'style-props') {
      try {
        this.styleProps = { ...this.styleProps, ...JSON.parse(newValue) };
        if (this.initialRenderDone && this.globe) this.updateGlobeStyles();
      } catch (e) {}
    } else if (name === 'map-data' && this.globe) {
      this.updateMarkers();
    }
  }

  getTranslations() {
    const translations = {
      en: { mapTitle: '🌍 Live Visitor Globe', cities: 'Cities', totalVisits: 'Total Visits', last24Hours: 'Last 24 Hours', recent: 'Recent', earlier: 'Earlier', loading: 'Loading...' },
    };
    const lang = this.styleProps.language || 'en';
    return translations[lang] || translations.en;
  }

  render() {
    const s = this.styleProps;
    const t = this.getTranslations();
    
    // Simplified CSS for better rendering performance
    const styles = `
      :host { display: block; width: 100%; height: 100%; min-height: 500px; }
      .globe-container { width: 100%; height: 100%; position: relative; background: linear-gradient(135deg, ${s.bgColor1}, ${s.bgColor2}); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
      .globe-wrapper { flex: 1; position: relative; overflow: hidden; cursor: grab; }
      .globe-wrapper:active { cursor: grabbing; }
      #globeViz { width: 100%; height: 100%; }
      
      .global-tooltip {
        position: absolute; top: 0; left: 0; background: ${s.tooltipBg}; color: white; padding: 10px 14px;
        border-radius: 8px; font-family: sans-serif; font-size: 12px; pointer-events: none;
        opacity: 0; transition: opacity 0.1s ease; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        will-change: transform; border: 1px solid rgba(255,255,255,0.1);
      }
      .global-tooltip.visible { opacity: 1; }
      
      .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: 600; pointer-events: none; }
      .controls-overlay { position: absolute; top: 20px; left: 20px; display: flex; gap: 10px; z-index: 10; }
      .control-btn { width: 40px; height: 40px; background: rgba(255,255,255,0.9); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #667eea; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .zoom-controls { position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
      .zoom-btn { width: 36px; height: 36px; background: rgba(255,255,255,0.9); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #667eea; border: none; }
      
      .bottom-stats { background: ${s.statsBgColor}; padding: 15px; display: flex; justify-content: space-around; align-items: center; font-family: sans-serif; border-top: 1px solid rgba(255,255,255,0.2); }
      .stats-group { display: flex; gap: 20px; }
      .stat-card { text-align: center; }
      .stat-value { font-size: 24px; font-weight: 800; color: ${s.statsValueColor}; }
      .stat-label { font-size: 10px; font-weight: 600; color: ${s.statsLabelColor}; text-transform: uppercase; }
      .legend-group { display: flex; gap: 15px; font-size: 12px; color: ${s.legendTextColor}; }
      .legend-item { display: flex; align-items: center; gap: 6px; }
      .map-title { font-weight: 700; color: ${s.titleColor}; font-size: 14px; }
      
      @media (max-width: 768px) {
        .bottom-stats { flex-direction: column; gap: 10px; }
        .map-title, .stat-divider { display: none; }
        .stats-group { width: 100%; justify-content: space-between; }
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="globe-container">
        <div class="globe-wrapper" id="globeWrapper">
          <div class="loading" id="loading">${t.loading}</div>
          <div id="globeViz"></div>
          <div id="globalTooltip" class="global-tooltip"></div>
          
          <div class="controls-overlay">
            <div class="control-btn active" id="autoRotateBtn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg></div>
            <div class="control-btn" id="resetViewBtn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg></div>
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
            <div class="stat-card"><div class="stat-value" id="totalVisits">0</div><div class="stat-label">${t.totalVisits}</div></div>
            <div class="stat-card"><div class="stat-value" id="recentCount">0</div><div class="stat-label">${t.last24Hours}</div></div>
          </div>
          <div class="legend-group">
            <div class="legend-item"><div style="width:10px;height:10px;background:${s.markerRecent};border-radius:50%"></div><span>${t.recent}</span></div>
            <div class="legend-item"><div style="width:10px;height:10px;background:${s.markerOld};border-radius:50%"></div><span>${t.earlier}</span></div>
          </div>
        </div>
      </div>
    `;
    
    this.initialRenderDone = true;
    this.updateVisibility();
    this.loadGlobeLibrary();
    this.setupControls();
    this.shadowRoot.getElementById('globeWrapper').addEventListener('mousemove', this.handleMouseMove);
  }

  handleMouseMove(e) {
    if (!this.tooltipActive) return;
    const tooltip = this.shadowRoot.getElementById('globalTooltip');
    const wrapperRect = this.shadowRoot.getElementById('globeWrapper').getBoundingClientRect();
    const x = e.clientX - wrapperRect.left;
    const y = e.clientY - wrapperRect.top;
    tooltip.style.transform = `translate(${x + 15}px, ${y - 30}px)`;
  }

  updateVisibility() {
    const { showZoom, showStats } = this.styleProps;
    const zoom = this.shadowRoot.getElementById('zoomControls');
    const stats = this.shadowRoot.getElementById('bottomStats');
    if(zoom) zoom.style.display = showZoom ? 'flex' : 'none';
    if(stats) stats.style.display = showStats ? 'flex' : 'none';
  }

  updateGlobeStyles() {
    if (!this.globe) return;
    const { countryFill, countryStroke, bgColor1 } = this.styleProps;
    
    this.globe
      .backgroundColor(bgColor1)
      .globeMaterial(new window.THREE.MeshLambertMaterial({ // Switched to Lambert (cheaper lighting)
        color: bgColor1, emissive: bgColor1, emissiveIntensity: 0.1
      }))
      .atmosphereColor(countryStroke);
      
    if (this.countriesData) {
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => countryFill)
        .polygonStrokeColor(() => countryStroke);
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
    
    resetViewBtn?.addEventListener('click', () => this.globe?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000));
    zoomIn?.addEventListener('click', () => { const p=this.globe?.pointOfView(); if(p) this.globe.pointOfView({ ...p, altitude: Math.max(p.altitude - 0.5, 1) }, 300); });
    zoomOut?.addEventListener('click', () => { const p=this.globe?.pointOfView(); if(p) this.globe.pointOfView({ ...p, altitude: Math.min(p.altitude + 0.5, 4) }, 300); });
  }

  loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  async loadGlobeLibrary() {
    try {
      if (!window.THREE) await this.loadScript('https://unpkg.com/three@0.160.0/build/three.min.js');
      await Promise.all([
        !window.topojson ? this.loadScript('https://unpkg.com/topojson@3') : Promise.resolve(),
        !window.Globe ? this.loadScript('//unpkg.com/globe.gl') : Promise.resolve()
      ]);
      this.initializeGlobe();
      window.addEventListener('resize', this.handleResize);
    } catch (e) {
      this.shadowRoot.getElementById('loading').textContent = 'Error';
    }
  }

  handleResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      if (!this.globe) return;
      const c = this.shadowRoot.getElementById('globeViz');
      this.globe.width(c.clientWidth).height(c.clientHeight);
    }, 200);
  }

  async initializeGlobe() {
    const container = this.shadowRoot.getElementById('globeViz');
    const { bgColor1, countryFill, countryStroke } = this.styleProps;
    
    // PERFORMANCE CONFIG: Antialias OFF, Low Power Mode
    this.globe = window.Globe({ 
      animateIn: true, 
      rendererConfig: { antialias: false, alpha: false, precision: 'mediump' } 
    })(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .backgroundColor(bgColor1 || '#667eea')
      .globeMaterial(new window.THREE.MeshLambertMaterial({ // Cheaper material
        color: bgColor1, emissive: bgColor1, emissiveIntensity: 0.1
      }))
      .atmosphereColor(countryStroke)
      .atmosphereAltitude(0.1) // Lower altitude = less glow calculations
      .pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

    this.globe.htmlTransitionDuration(0); // Prevents lag
    this.globe.controls().autoRotate = true;
    this.globe.controls().autoRotateSpeed = 0.5;
    this.globe.controls().enableZoom = true;

    try {
      // LOW RES DATA (110m) for SPEED
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const worldData = await response.json();
      this.countriesData = window.topojson.feature(worldData, worldData.objects.countries);
      
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => countryFill || '#ffffff')
        .polygonSideColor(() => 'rgba(0,0,0,0)') // Transparent sides saves GPU
        .polygonStrokeColor(() => countryStroke || '#667eea')
        .polygonAltitude(0.005); // Flat polygons are faster
      
      this.shadowRoot.getElementById('loading').style.display = 'none';
      const mapData = this.getAttribute('map-data');
      if (mapData) this.updateMarkers();
      
    } catch (e) { console.error(e); }
  }

  updateMarkers() {
    if (!this.globe) return;
    const mapData = this.getAttribute('map-data');
    if (!mapData) return;

    try {
      const locations = JSON.parse(mapData);
      const { markerRecent, markerOld, markerSize, showPulse, showVisitCount, badgeBg, badgeText } = this.styleProps;
      const tooltipEl = this.shadowRoot.getElementById('globalTooltip');

      let recent = 0, total = 0;
      locations.forEach(l => { if(l.isRecent) recent++; total += (l.totalVisits || 1); });
      
      this.shadowRoot.getElementById('cityCount').innerText = locations.length;
      this.shadowRoot.getElementById('totalVisits').innerText = total;
      this.shadowRoot.getElementById('recentCount').innerText = recent;

      this.globe
        .htmlElementsData(locations)
        .htmlLat(d => d.lat)
        .htmlLng(d => d.lng)
        .htmlAltitude(0.01)
        .htmlElement(d => {
          const el = document.createElement('div');
          el.style.cssText = 'cursor:pointer;pointer-events:auto;transform:translate(-50%,-100%);';
          const color = d.isRecent ? markerRecent : markerOld;
          const size = markerSize || 24;
          
          el.innerHTML = `
            <div style="width:${size}px;height:${size}px;position:relative;">
               <svg viewBox="0 0 24 34" style="width:100%;height:100%;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));">
                 <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8z" fill="${color}"/>
               </svg>
               ${showVisitCount && d.totalVisits > 1 ? `<div style="position:absolute;top:-5px;right:-5px;background:${badgeBg};color:${badgeText};border-radius:50%;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center;border:1px solid ${color};">${d.totalVisits > 99 ? '99+' : d.totalVisits}</div>` : ''}
            </div>`;

          el.addEventListener('mouseenter', () => {
            this.tooltipActive = true;
            tooltipEl.classList.add('visible');
            tooltipEl.innerHTML = `<strong style="display:block;margin-bottom:2px;">📍 ${d.title || 'City'}</strong><span>Visits: ${d.totalVisits || 1}</span>`;
          });
          el.addEventListener('mouseleave', () => {
            this.tooltipActive = false;
            tooltipEl.classList.remove('visible');
          });
          return el;
        });

      if (showPulse) {
        this.globe.ringsData(locations.filter(l => l.isRecent))
          .ringColor(() => markerRecent).ringMaxRadius(4).ringPropagationSpeed(2).ringRepeatPeriod(1500);
      } else {
        this.globe.ringsData([]);
      }
    } catch (e) {}
  }
}

customElements.define('d3-globe-element', D3GlobeElement);
console.log('✅ Performance Optimized D3 Globe (Low Res)');

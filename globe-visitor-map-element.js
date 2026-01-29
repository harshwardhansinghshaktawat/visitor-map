class GlobeVisitorMapElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.globe = null;
    this.handleResize = this.handleResize.bind(this);
    this.resizeTimeout = null;
    this.animationFrameId = null;
    
    const initialStyleProps = this.getAttribute('style-props');
    this.styleProps = initialStyleProps ? JSON.parse(initialStyleProps) : this.getDefaultStyleProps();
    
    console.log('✅ GlobeVisitorMapElement: Constructor called');
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
    console.log('✅ GlobeVisitorMapElement: Connected to DOM');
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
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.globe) {
      this.globe._destructor();
      this.globe = null;
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
        console.log('🎨 Style props updated:', this.styleProps);
        
        if (this.globe) {
          this.updateGlobeStyles();
        }
      } catch (error) {
        console.error('Error parsing style props:', error);
      }
    } else if (name === 'map-data' && this.globe) {
      console.log('🔄 Map data changed, updating markers');
      this.updateMarkers();
    }
  }

  getTranslations() {
    const translations = {
      en: {
        mapTitle: '🌍 Live Visitor Globe',
        cities: 'Cities',
        totalVisits: 'Total Visits',
        last24Hours: 'Last 24 Hours',
        recent: 'Recent',
        earlier: 'Earlier',
        totalVisitsLabel: 'Total Visits:',
        uniqueVisitors: 'Unique Visitors:',
        lastVisit: 'Last Visit:',
        activeNow: '🟢 Active in last 24h'
      },
      es: {
        mapTitle: '🌍 Globo de Visitantes en Vivo',
        cities: 'Ciudades',
        totalVisits: 'Visitas Totales',
        last24Hours: 'Últimas 24 Horas',
        recent: 'Reciente',
        earlier: 'Anterior',
        totalVisitsLabel: 'Visitas Totales:',
        uniqueVisitors: 'Visitantes Únicos:',
        lastVisit: 'Última Visita:',
        activeNow: '🟢 Activo en las últimas 24h'
      },
      fr: {
        mapTitle: '🌍 Globe des Visiteurs en Direct',
        cities: 'Villes',
        totalVisits: 'Visites Totales',
        last24Hours: 'Dernières 24 Heures',
        recent: 'Récent',
        earlier: 'Plus tôt',
        totalVisitsLabel: 'Visites Totales:',
        uniqueVisitors: 'Visiteurs Uniques:',
        lastVisit: 'Dernière Visite:',
        activeNow: '🟢 Actif dans les dernières 24h'
      },
      de: {
        mapTitle: '🌍 Live-Besucherglobus',
        cities: 'Städte',
        totalVisits: 'Gesamtbesuche',
        last24Hours: 'Letzte 24 Stunden',
        recent: 'Kürzlich',
        earlier: 'Früher',
        totalVisitsLabel: 'Gesamtbesuche:',
        uniqueVisitors: 'Einzigartige Besucher:',
        lastVisit: 'Letzter Besuch:',
        activeNow: '🟢 Aktiv in den letzten 24h'
      },
      zh: {
        mapTitle: '🌍 实时访客地球仪',
        cities: '城市',
        totalVisits: '总访问量',
        last24Hours: '过去24小时',
        recent: '最近',
        earlier: '较早',
        totalVisitsLabel: '总访问量：',
        uniqueVisitors: '独立访客：',
        lastVisit: '最后访问：',
        activeNow: '🟢 最近24小时活跃'
      },
      ja: {
        mapTitle: '🌍 リアルタイム訪問者グローブ',
        cities: '都市',
        totalVisits: '総訪問数',
        last24Hours: '過去24時間',
        recent: '最近',
        earlier: '以前',
        totalVisitsLabel: '総訪問数：',
        uniqueVisitors: 'ユニーク訪問者：',
        lastVisit: '最終訪問：',
        activeNow: '🟢 過去24時間にアクティブ'
      },
      ko: {
        mapTitle: '🌍 실시간 방문자 지구본',
        cities: '도시',
        totalVisits: '총 방문 수',
        last24Hours: '지난 24시간',
        recent: '최근',
        earlier: '이전',
        totalVisitsLabel: '총 방문 수:',
        uniqueVisitors: '고유 방문자:',
        lastVisit: '마지막 방문:',
        activeNow: '🟢 지난 24시간 동안 활성'
      },
      ar: {
        mapTitle: '🌍 كرة أرضية للزوار المباشرة',
        cities: 'مدن',
        totalVisits: 'إجمالي الزيارات',
        last24Hours: 'آخر 24 ساعة',
        recent: 'حديث',
        earlier: 'سابق',
        totalVisitsLabel: 'إجمالي الزيارات:',
        uniqueVisitors: 'زوار فريدون:',
        lastVisit: 'آخر زيارة:',
        activeNow: '🟢 نشط في آخر 24 ساعة'
      },
      tr: {
        mapTitle: '🌍 Canlı Ziyaretçi Küresi',
        cities: 'Şehirler',
        totalVisits: 'Toplam Ziyaret',
        last24Hours: 'Son 24 Saat',
        recent: 'Yakın Tarih',
        earlier: 'Önceki',
        totalVisitsLabel: 'Toplam Ziyaret:',
        uniqueVisitors: 'Benzersiz Ziyaretçiler:',
        lastVisit: 'Son Ziyaret:',
        activeNow: '🟢 Son 24 saatte aktif'
      },
      pt: {
        mapTitle: '🌍 Globo de Visitantes ao Vivo',
        cities: 'Cidades',
        totalVisits: 'Visitas Totais',
        last24Hours: 'Últimas 24 Horas',
        recent: 'Recente',
        earlier: 'Anterior',
        totalVisitsLabel: 'Visitas Totais:',
        uniqueVisitors: 'Visitantes Únicos:',
        lastVisit: 'Última Visita:',
        activeNow: '🟢 Ativo nas últimas 24h'
      },
      ru: {
        mapTitle: '🌍 Глобус посетителей в реальном времени',
        cities: 'Города',
        totalVisits: 'Всего посещений',
        last24Hours: 'За последние 24 часа',
        recent: 'Недавние',
        earlier: 'Ранее',
        totalVisitsLabel: 'Всего посещений:',
        uniqueVisitors: 'Уникальные посетители:',
        lastVisit: 'Последний визит:',
        activeNow: '🟢 Активен за последние 24ч'
      },
      it: {
        mapTitle: '🌍 Globo Visitatori in Tempo Reale',
        cities: 'Città',
        totalVisits: 'Visite Totali',
        last24Hours: 'Ultime 24 Ore',
        recent: 'Recente',
        earlier: 'Precedente',
        totalVisitsLabel: 'Visite Totali:',
        uniqueVisitors: 'Visitatori Unici:',
        lastVisit: 'Ultima Visita:',
        activeNow: '🟢 Attivo nelle ultime 24h'
      },
      nl: {
        mapTitle: '🌍 Live Bezoekers Globe',
        cities: 'Steden',
        totalVisits: 'Totale Bezoeken',
        last24Hours: 'Laatste 24 Uur',
        recent: 'Recent',
        earlier: 'Eerder',
        totalVisitsLabel: 'Totale Bezoeken:',
        uniqueVisitors: 'Unieke Bezoekers:',
        lastVisit: 'Laatste Bezoek:',
        activeNow: '🟢 Actief in de laatste 24u'
      },
      hi: {
        mapTitle: '🌍 लाइव आगंतुक ग्लोब',
        cities: 'शहर',
        totalVisits: 'कुल विज़िट',
        last24Hours: 'पिछले 24 घंटे',
        recent: 'हाल का',
        earlier: 'पहले',
        totalVisitsLabel: 'कुल विज़िट:',
        uniqueVisitors: 'अद्वितीय आगंतुक:',
        lastVisit: 'अंतिम विज़िट:',
        activeNow: '🟢 पिछले 24 घंटों में सक्रिय'
      }
    };
    
    const lang = this.styleProps.language || 'en';
    return translations[lang] || translations.en;
  }

  render() {
    console.log('🎨 Rendering 3D Globe');
    
    const styles = this.getStyles();
    const t = this.getTranslations();
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="globe-container">
        <div class="globe-wrapper" id="globeWrapper">
          <div class="loading" id="loading">Loading 3D globe...</div>
          <div id="globeViz"></div>
          
          <div class="zoom-controls" id="zoomControls">
            <button class="zoom-btn" id="zoomIn" title="Zoom In">+</button>
            <button class="zoom-btn zoom-reset" id="zoomReset" title="Reset View">⟲</button>
            <button class="zoom-btn" id="zoomOut" title="Zoom Out">−</button>
          </div>
        </div>
        
        <div class="bottom-stats" id="bottomStats">
          <div class="map-title">
            ${t.mapTitle}
          </div>
          
          <div class="stats-group">
            <div class="stat-card">
              <div class="stat-value" id="cityCount">0</div>
              <div class="stat-label">${t.cities}</div>
            </div>
            
            <div class="stat-divider"></div>
            
            <div class="stat-card">
              <div class="stat-value" id="totalVisits">0</div>
              <div class="stat-label">${t.totalVisits}</div>
            </div>
            
            <div class="stat-divider"></div>
            
            <div class="stat-card">
              <div class="stat-value" id="recentCount">0</div>
              <div class="stat-label">${t.last24Hours}</div>
            </div>
          </div>
          
          <div class="legend-group">
            <div class="legend-item">
              <div class="legend-dot" style="background: ${this.styleProps.markerRecent};"></div>
              <span>${t.recent}</span>
            </div>
            
            <div class="legend-item">
              <div class="legend-dot" style="background: ${this.styleProps.markerOld};"></div>
              <span>${t.earlier}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.updateVisibility();
    this.loadGlobeGL();
    this.setupZoomControls();
  }

  getStyles() {
    const { 
      bgColor1, bgColor2, markerRecent, markerOld,
      titleColor, statsValueColor, statsLabelColor, statsBgColor, legendTextColor
    } = this.styleProps;
    
    return `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 500px;
      }
      
      .globe-container {
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
      
      .globe-wrapper {
        flex: 1;
        position: relative;
        overflow: hidden;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      
      #globeViz {
        width: 100%;
        height: 100%;
        flex: 1;
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
        z-index: 10;
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
        background: ${statsBgColor};
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
        margin: 0;
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
        color: ${statsLabelColor};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .stat-value {
        font-size: 28px;
        font-weight: 800;
        color: ${statsValueColor};
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
        color: ${legendTextColor};
      }
      
      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .map-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: ${titleColor};
      }
      
      /* Tooltip styling for globe.gl */
      .globe-tooltip {
        background: rgba(26, 32, 44, 0.98) !important;
        color: white !important;
        padding: 14px 18px !important;
        border-radius: 10px !important;
        font-size: 13px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(10px) !important;
        min-width: 200px !important;
        line-height: 1.4 !important;
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
        
        .globe-container {
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
      }
      
      @media (max-width: 480px) {
        :host {
          min-height: 350px;
        }
        
        .globe-container {
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

  updateVisibility() {
    const { showZoom, showStats } = this.styleProps;
    
    const zoomControls = this.shadowRoot.getElementById('zoomControls');
    const bottomStats = this.shadowRoot.getElementById('bottomStats');
    
    if (zoomControls) {
      zoomControls.style.display = showZoom ? 'flex' : 'none';
    }
    
    if (bottomStats) {
      bottomStats.style.display = showStats ? 'flex' : 'none';
    }
  }

  setupZoomControls() {
    const zoomIn = this.shadowRoot.getElementById('zoomIn');
    const zoomOut = this.shadowRoot.getElementById('zoomOut');
    const zoomReset = this.shadowRoot.getElementById('zoomReset');
    
    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        if (!this.globe) return;
        const currentAltitude = this.globe.pointOfView().altitude;
        this.globe.pointOfView({ altitude: currentAltitude * 0.7 }, 300);
      });
    }
    
    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        if (!this.globe) return;
        const currentAltitude = this.globe.pointOfView().altitude;
        this.globe.pointOfView({ altitude: Math.min(currentAltitude * 1.3, 3) }, 300);
      });
    }
    
    if (zoomReset) {
      zoomReset.addEventListener('click', () => {
        if (!this.globe) return;
        this.globe.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
      });
    }
  }

  async loadGlobeGL() {
    try {
      console.log('📦 Loading Globe.GL library...');
      
      if (!window.Globe) {
        await this.loadScript('https://unpkg.com/globe.gl@2.31.0/dist/globe.gl.min.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!window.Globe) {
        throw new Error('Globe.GL failed to load');
      }
      console.log('✅ Globe.GL loaded');
      
      await this.initializeGlobe();
      window.addEventListener('resize', this.handleResize);
      
    } catch (error) {
      console.error('❌ Error loading Globe.GL:', error);
      this.shadowRoot.getElementById('loading').textContent = 'Error loading globe';
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (src.includes('globe.gl') && window.Globe) {
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

  async initializeGlobe() {
    console.log('🌍 Initializing 3D Globe...');
    
    const globeViz = this.shadowRoot.getElementById('globeViz');
    const loading = this.shadowRoot.getElementById('loading');
    
    const { bgColor1, bgColor2, markerRecent, markerOld, markerSize } = this.styleProps;
    
    // Create globe instance
    this.globe = Globe()(globeViz)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .width(globeViz.clientWidth)
      .height(globeViz.clientHeight)
      .pointOfView({ lat: 0, lng: 0, altitude: 2.5 });
    
    // Enable controls
    this.globe.controls().enableZoom = true;
    this.globe.controls().autoRotate = true;
    this.globe.controls().autoRotateSpeed = 0.3;
    
    loading.style.display = 'none';
    
    // Update markers if data exists
    const mapData = this.getAttribute('map-data');
    if (mapData) {
      console.log('📍 Initial map data found, rendering markers');
      this.updateMarkers();
    }
    
    console.log('✅ Globe initialized');
  }

  handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      if (!this.globe) return;
      
      const globeViz = this.shadowRoot.getElementById('globeViz');
      if (globeViz) {
        this.globe
          .width(globeViz.clientWidth)
          .height(globeViz.clientHeight);
      }
    }, 250);
  }

  updateGlobeStyles() {
    // Globe styles updated - re-render if needed
    this.updateMarkers();
  }

  updateMarkers() {
    if (!this.globe) {
      console.log('⏳ Globe not loaded yet');
      return;
    }
    
    const mapData = this.getAttribute('map-data');
    if (!mapData) {
      console.log('⚠️ No map data attribute');
      return;
    }
    
    try {
      const locations = JSON.parse(mapData);
      const t = this.getTranslations();
      console.log('\n========== UPDATING GLOBE MARKERS ==========');
      console.log('📍 Total cities:', locations.length);
      
      if (locations.length === 0) {
        console.log('⚠️ No locations to display');
        return;
      }
      
      const { markerRecent, markerOld, markerSize, showTooltip, tooltipTitleColor, tooltipLabelColor, tooltipValueColor, tooltipHighlightColor } = this.styleProps;
      
      // Calculate statistics
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      let recentCount = 0;
      let totalVisits = 0;
      
      locations.forEach(location => {
        if (location.isRecent) recentCount++;
        totalVisits += location.totalVisits || 0;
      });
      
      // Update points on globe
      this.globe
        .pointsData(locations)
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointColor(d => d.isRecent ? markerRecent : markerOld)
        .pointAltitude(0.01)
        .pointRadius(markerSize / 1000)
        .pointLabel(d => {
          if (!showTooltip) return '';
          
          return `
            <div style="
              background: rgba(26, 32, 44, 0.98);
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 12px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              line-height: 1.4;
              min-width: 180px;
            ">
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: ${tooltipTitleColor};">
                📍 ${d.title || 'Visitor Location'}
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="color: ${tooltipLabelColor};">${t.totalVisitsLabel}</span>
                <span style="color: ${tooltipValueColor}; font-weight: 600;">${d.totalVisits || 1}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="color: ${tooltipLabelColor};">${t.uniqueVisitors}</span>
                <span style="color: ${tooltipValueColor}; font-weight: 600;">${d.visitorCount || 1}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="color: ${tooltipLabelColor};">${t.lastVisit}</span>
                <span style="color: ${tooltipValueColor}; font-weight: 600;">${d.lastVisit || 'Unknown'}</span>
              </div>
              ${d.isRecent ? `<div style="background: rgba(72, 187, 120, 0.2); padding: 4px 8px; border-radius: 4px; margin-top: 6px; text-align: center; color: ${tooltipHighlightColor}; font-weight: 600;">${t.activeNow}</div>` : ''}
            </div>
          `;
        });
      
      // Add rings animation for recent visitors
      if (this.styleProps.showPulse) {
        const recentLocations = locations.filter(d => d.isRecent);
        
        this.globe
          .ringsData(recentLocations)
          .ringLat(d => d.lat)
          .ringLng(d => d.lng)
          .ringColor(() => markerRecent)
          .ringMaxRadius(5)
          .ringPropagationSpeed(2)
          .ringRepeatPeriod(2000);
      } else {
        this.globe.ringsData([]);
      }
      
      // Add arcs for visual effect (optional - connecting recent visitors)
      const arcsData = [];
      if (locations.length > 1 && recentCount > 1) {
        const recentLocs = locations.filter(d => d.isRecent).slice(0, 5);
        for (let i = 0; i < recentLocs.length - 1; i++) {
          arcsData.push({
            startLat: recentLocs[i].lat,
            startLng: recentLocs[i].lng,
            endLat: recentLocs[i + 1].lat,
            endLng: recentLocs[i + 1].lng
          });
        }
      }
      
      this.globe
        .arcsData(arcsData)
        .arcColor(() => markerRecent)
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2000)
        .arcStroke(0.5);
      
      console.log('\n📊 STATISTICS');
      console.log('Cities:', locations.length);
      console.log('Total Visits:', totalVisits);
      console.log('Recent (24h):', recentCount);
      console.log('======================================\n');
      
      // Update statistics
      this.shadowRoot.getElementById('cityCount').textContent = locations.length;
      this.shadowRoot.getElementById('totalVisits').textContent = totalVisits;
      this.shadowRoot.getElementById('recentCount').textContent = recentCount;
      
    } catch (error) {
      console.error('❌ Error updating markers:', error);
    }
  }
}

customElements.define('globe-visitor-map-element', GlobeVisitorMapElement);
console.log('✅ globe-visitor-map-element registered');

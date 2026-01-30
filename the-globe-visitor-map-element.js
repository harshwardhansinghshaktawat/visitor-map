class GlobeVisitorMapElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.projection = null;
    this.path = null;
    this.svg = null;
    this.globe = null;
    this.markers = null;
    this.countries = null;
    this.handleResize = this.handleResize.bind(this);
    this.resizeTimeout = null;
    
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
        
        if (this.svg) {
          this.updateGlobeStyles();
          this.updateMarkers();
        }
      } catch (error) {
        console.error('Error parsing style props:', error);
      }
    } else if (name === 'map-data' && this.svg) {
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
    console.log('🎨 Rendering D3 3D Globe');
    
    const styles = this.getStyles();
    const t = this.getTranslations();
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="globe-container">
        <div class="globe-wrapper" id="globeWrapper">
          <div class="loading" id="loading">Loading 3D globe...</div>
          <svg id="globeSvg"></svg>
          
          <div class="zoom-controls" id="zoomControls">
            <button class="zoom-btn" id="zoomIn" title="Zoom In">+</button>
            <button class="zoom-btn zoom-reset" id="zoomReset" title="Reset View">⟲</button>
            <button class="zoom-btn" id="zoomOut" title="Zoom Out">−</button>
          </div>
          
          <div class="tooltip" id="tooltip"></div>
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
    this.loadD3();
    this.setupZoomControls();
  }

  getStyles() {
    const { 
      bgColor1, bgColor2, markerRecent, markerOld,
      titleColor, statsValueColor, statsLabelColor, statsBgColor, legendTextColor,
      tooltipBg, tooltipTitleColor, tooltipLabelColor, tooltipValueColor
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
      
      #globeSvg {
        width: 100%;
        height: 100%;
        flex: 1;
        cursor: grab;
      }
      
      #globeSvg:active {
        cursor: grabbing;
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
        pointer-events: none;
      }
      
      .tooltip {
        position: absolute;
        background: ${tooltipBg};
        color: white;
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
        color: ${tooltipTitleColor};
      }
      
      .tooltip-row {
        display: flex;
        justify-content: space-between;
        margin: 4px 0;
        font-size: 12px;
      }
      
      .tooltip-label {
        color: ${tooltipLabelColor};
        margin-right: 12px;
      }
      
      .tooltip-value {
        color: ${tooltipValueColor};
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
      
      /* Pulse animation for markers */
      @keyframes pulse {
        0% {
          r: 0;
          opacity: 0.8;
        }
        100% {
          r: 15;
          opacity: 0;
        }
      }
      
      .marker-pulse {
        animation: pulse 2s ease-out infinite;
      }
      
      /* Responsive Design */
      @media (max-width: 1024px) {
        .bottom-stats { padding: 12px 16px; }
        .stats-group { gap: 20px; }
        .stat-card { min-width: 80px; }
        .stat-value { font-size: 24px; }
        .stat-label { font-size: 11px; }
        .zoom-controls { top: 12px; right: 12px; }
        .zoom-btn { width: 36px; height: 36px; font-size: 18px; }
      }
      
      @media (max-width: 768px) {
        :host { min-height: 400px; }
        .globe-container { min-height: 400px; border-radius: 8px; }
        .bottom-stats { flex-direction: column; padding: 12px; gap: 12px; }
        .stats-group { width: 100%; gap: 16px; }
        .stat-divider { display: none; }
        .legend-group { width: 100%; justify-content: center; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.1); }
        .stat-card { min-width: 70px; }
        .stat-value { font-size: 20px; }
        .map-title { display: none; }
        .zoom-controls { top: 8px; right: 8px; gap: 6px; }
        .zoom-btn { width: 32px; height: 32px; font-size: 16px; }
        .tooltip { font-size: 11px; padding: 10px 14px; min-width: 180px; }
        .tooltip strong { font-size: 13px; }
      }
      
      @media (max-width: 480px) {
        :host { min-height: 350px; }
        .globe-container { min-height: 350px; border-radius: 6px; }
        .stat-value { font-size: 18px; }
        .stat-label { font-size: 10px; }
        .stat-card { min-width: 60px; }
        .zoom-controls { top: 6px; right: 6px; }
        .zoom-btn { width: 28px; height: 28px; font-size: 14px; }
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
        if (!this.projection) return;
        const currentScale = this.projection.scale();
        this.projection.scale(currentScale * 1.2);
        this.redrawGlobe();
      });
    }
    
    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        if (!this.projection) return;
        const currentScale = this.projection.scale();
        this.projection.scale(currentScale / 1.2);
        this.redrawGlobe();
      });
    }
    
    if (zoomReset) {
      zoomReset.addEventListener('click', () => {
        if (!this.projection) return;
        const container = this.shadowRoot.getElementById('globeWrapper');
        const size = Math.min(container.clientWidth, container.clientHeight);
        this.projection.scale(size / 2).rotate([0, 0]);
        this.redrawGlobe();
      });
    }
  }

  async loadD3() {
    try {
      console.log('📦 Loading D3.js library...');
      
      if (!window.d3) {
        await this.loadScript('https://d3js.org/d3.v7.min.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!window.d3) {
        throw new Error('D3.js failed to load');
      }
      console.log('✅ D3.js loaded');
      
      await this.initializeGlobe();
      window.addEventListener('resize', this.handleResize);
      
    } catch (error) {
      console.error('❌ Error loading D3.js:', error);
      this.shadowRoot.getElementById('loading').textContent = 'Error loading globe';
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (src.includes('d3.v7') && window.d3) {
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
    console.log('🌍 Initializing D3 3D Globe...');
    
    const container = this.shadowRoot.getElementById('globeWrapper');
    const loading = this.shadowRoot.getElementById('loading');
    
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const size = Math.min(width, height);
    
    // Create SVG
    this.svg = d3.select(this.shadowRoot.getElementById('globeSvg'))
      .attr('width', width)
      .attr('height', height);
    
    // Create projection (orthographic for 3D globe effect)
    this.projection = d3.geoOrthographic()
      .scale(size / 2)
      .translate([width / 2, height / 2])
      .clipAngle(90);
    
    // Create path generator
    this.path = d3.geoPath().projection(this.projection);
    
    // Create globe background (ocean)
    const { countryFill, countryStroke } = this.styleProps;
    
    this.svg.append('circle')
      .attr('class', 'globe-sphere')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', this.projection.scale())
      .attr('fill', countryFill)
      .attr('stroke', countryStroke)
      .attr('stroke-width', 2);
    
    // Create groups for countries and markers
    this.globe = this.svg.append('g').attr('class', 'globe-group');
    this.countries = this.globe.append('g').attr('class', 'countries');
    this.markers = this.globe.append('g').attr('class', 'markers');
    
    // Load world data
    try {
      const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const countries = topojson.feature(world, world.objects.countries);
      
      this.countries.selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('class', 'country')
        .attr('d', this.path)
        .attr('fill', countryFill)
        .attr('stroke', countryStroke)
        .attr('stroke-width', 0.5)
        .on('mouseenter', function() {
          d3.select(this).attr('fill', this.styleProps.countryHover);
        }.bind(this))
        .on('mouseleave', function() {
          d3.select(this).attr('fill', countryFill);
        });
      
      console.log('✅ World map loaded');
    } catch (error) {
      console.error('Error loading world data:', error);
    }
    
    // Setup drag behavior
    const drag = d3.drag()
      .on('start', () => {
        this.svg.style('cursor', 'grabbing');
      })
      .on('drag', (event) => {
        const rotate = this.projection.rotate();
        const k = 75 / this.projection.scale();
        this.projection.rotate([
          rotate[0] + event.dx * k,
          rotate[1] - event.dy * k
        ]);
        this.redrawGlobe();
      })
      .on('end', () => {
        this.svg.style('cursor', 'grab');
      });
    
    this.svg.call(drag);
    
    // Auto-rotation
    let autoRotate = true;
    const rotate = () => {
      if (autoRotate) {
        const currentRotate = this.projection.rotate();
        this.projection.rotate([currentRotate[0] + 0.2, currentRotate[1]]);
        this.redrawGlobe();
      }
    };
    
    setInterval(rotate, 30);
    
    this.svg.on('mousedown', () => { autoRotate = false; });
    this.svg.on('mouseup', () => {
      setTimeout(() => { autoRotate = true; }, 2000);
    });
    
    loading.style.display = 'none';
    
    // Load markers if data exists
    const mapData = this.getAttribute('map-data');
    if (mapData) {
      console.log('📍 Initial map data found, rendering markers');
      this.updateMarkers();
    }
    
    console.log('✅ Globe initialized');
  }

  redrawGlobe() {
    if (!this.countries || !this.markers || !this.path) return;
    
    // Update countries
    this.countries.selectAll('path').attr('d', this.path);
    
    // Update markers
    this.markers.selectAll('.marker-group').each(function(d) {
      const projected = this.projection([d.lng, d.lat]);
      if (projected) {
        const visible = this.path({type: 'Point', coordinates: [d.lng, d.lat]}) !== null;
        d3.select(this)
          .style('display', visible ? 'block' : 'none')
          .attr('transform', `translate(${projected[0]},${projected[1]})`);
      }
    }.bind(this));
  }

  updateGlobeStyles() {
    if (!this.svg) return;
    
    const { countryFill, countryStroke, countryHover } = this.styleProps;
    
    // Update globe sphere
    this.svg.select('.globe-sphere')
      .attr('fill', countryFill)
      .attr('stroke', countryStroke);
    
    // Update countries
    this.countries.selectAll('path')
      .attr('fill', countryFill)
      .attr('stroke', countryStroke)
      .on('mouseenter', function() {
        d3.select(this).attr('fill', countryHover);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill', countryFill);
      });
    
    console.log('✅ Globe styles updated');
  }

  updateMarkers() {
    if (!this.markers) {
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
      
      const { 
        markerRecent, markerOld, markerSize, showPulse, showVisitCount, showTooltip,
        badgeBg, badgeText, tooltipHighlightColor
      } = this.styleProps;
      
      // Calculate statistics
      let recentCount = 0;
      let totalVisits = 0;
      
      locations.forEach(location => {
        if (location.isRecent) recentCount++;
        totalVisits += location.totalVisits || 0;
      });
      
      // Clear existing markers
      this.markers.selectAll('*').remove();
      
      // Create marker groups
      const markerGroups = this.markers.selectAll('.marker-group')
        .data(locations)
        .join('g')
        .attr('class', 'marker-group')
        .each(function(d) {
          const projected = this.projection([d.lng, d.lat]);
          if (projected) {
            const visible = this.path({type: 'Point', coordinates: [d.lng, d.lat]}) !== null;
            d3.select(this)
              .style('display', visible ? 'block' : 'none')
              .attr('transform', `translate(${projected[0]},${projected[1]})`);
          }
        }.bind(this));
      
      // Add pulse circles for recent visitors
      if (showPulse) {
        markerGroups.filter(d => d.isRecent)
          .append('circle')
          .attr('class', 'marker-pulse')
          .attr('r', 0)
          .attr('fill', d => d.isRecent ? markerRecent : markerOld)
          .attr('opacity', 0);
      }
      
      // Add main marker circles
      markerGroups.append('circle')
        .attr('class', 'marker-circle')
        .attr('r', markerSize / 4)
        .attr('fill', d => d.isRecent ? markerRecent : markerOld)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');
      
      // Add visit count badges
      if (showVisitCount) {
        markerGroups.filter(d => d.totalVisits > 1)
          .append('g')
          .attr('class', 'badge-group')
          .attr('transform', `translate(${markerSize / 3}, ${-markerSize / 3})`)
          .each(function(d) {
            const group = d3.select(this);
            
            // Badge background
            group.append('circle')
              .attr('r', 10)
              .attr('fill', badgeBg)
              .attr('stroke', d.isRecent ? markerRecent : markerOld)
              .attr('stroke-width', 1.5);
            
            // Badge text
            group.append('text')
              .attr('text-anchor', 'middle')
              .attr('dy', '0.35em')
              .attr('font-size', '10px')
              .attr('font-weight', 'bold')
              .attr('fill', badgeText)
              .text(d.totalVisits > 99 ? '99+' : d.totalVisits);
          });
      }
      
      // Add tooltips
      if (showTooltip) {
        const tooltip = this.shadowRoot.getElementById('tooltip');
        
        markerGroups
          .on('mouseenter', (event, d) => {
            tooltip.innerHTML = `
              <strong>📍 ${d.title || 'Visitor Location'}</strong>
              <div class="tooltip-row">
                <span class="tooltip-label">${t.totalVisitsLabel}</span>
                <span class="tooltip-value">${d.totalVisits || 1}</span>
              </div>
              <div class="tooltip-row">
                <span class="tooltip-label">${t.uniqueVisitors}</span>
                <span class="tooltip-value">${d.visitorCount || 1}</span>
              </div>
              <div class="tooltip-row">
                <span class="tooltip-label">${t.lastVisit}</span>
                <span class="tooltip-value">${d.lastVisit || 'Unknown'}</span>
              </div>
              ${d.isRecent ? `<div style="background: rgba(72, 187, 120, 0.2); padding: 4px 10px; border-radius: 6px; margin-top: 6px; text-align: center; color: ${tooltipHighlightColor}; font-weight: 600;">${t.activeNow}</div>` : ''}
            `;
            
            const container = this.shadowRoot.getElementById('globeWrapper');
            const rect = container.getBoundingClientRect();
            
            tooltip.style.left = `${event.clientX - rect.left + 15}px`;
            tooltip.style.top = `${event.clientY - rect.top + 15}px`;
            tooltip.classList.add('active');
          })
          .on('mousemove', (event) => {
            const container = this.shadowRoot.getElementById('globeWrapper');
            const rect = container.getBoundingClientRect();
            
            tooltip.style.left = `${event.clientX - rect.left + 15}px`;
            tooltip.style.top = `${event.clientY - rect.top + 15}px`;
          })
          .on('mouseleave', () => {
            tooltip.classList.remove('active');
          });
      }
      
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

  handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      if (!this.svg || !this.projection) return;
      
      const container = this.shadowRoot.getElementById('globeWrapper');
      const width = container.clientWidth;
      const height = container.clientHeight;
      const size = Math.min(width, height);
      
      this.svg
        .attr('width', width)
        .attr('height', height);
      
      this.projection
        .scale(size / 2)
        .translate([width / 2, height / 2]);
      
      this.svg.select('.globe-sphere')
        .attr('cx', width / 2)
        .attr('cy', height / 2)
        .attr('r', this.projection.scale());
      
      this.redrawGlobe();
    }, 250);
  }
}

customElements.define('globe-visitor-map-element', GlobeVisitorMapElement);
console.log('✅ globe-visitor-map-element registered');

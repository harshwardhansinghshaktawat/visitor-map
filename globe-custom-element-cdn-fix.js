class D3GlobeElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.globe = null;
    this.handleResize = this.handleResize.bind(this);
    this.resizeTimeout = null;
    this.initialRenderDone = false;
    this.autoRotate = true;
    this.countriesData = null;
    this._destroyed = false;
    
    const initialStyleProps = this.getAttribute('style-props');
    this.styleProps = initialStyleProps ? JSON.parse(initialStyleProps) : this.getDefaultStyleProps();
    
    console.log('✅ D3GlobeElement: Constructor called');
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
    console.log('✅ D3GlobeElement: Connected to DOM');
    this._destroyed = false;
    setTimeout(() => {
      if (this._destroyed) return;
      const stylePropsAttr = this.getAttribute('style-props');
      if (stylePropsAttr) {
        try { this.styleProps = JSON.parse(stylePropsAttr); } catch(e) {}
      }
      this.render();
    }, 50);
  }

  disconnectedCallback() {
    this._destroyed = true;
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    if (this.globe) {
      try { this.globe._destructor(); } catch (e) {}
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
        if (this.initialRenderDone && this.globe) {
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
        activeNow: '🟢 Active in last 24h',
        loading: 'Loading 3D Globe...'
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
        activeNow: '🟢 Activo en las últimas 24h',
        loading: 'Cargando Globo 3D...'
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
        activeNow: '🟢 Actif dans les dernières 24h',
        loading: 'Chargement du Globe 3D...'
      },
      de: {
        mapTitle: '🌍 Live-Besucher-Globus',
        cities: 'Städte',
        totalVisits: 'Gesamtbesuche',
        last24Hours: 'Letzte 24 Stunden',
        recent: 'Kürzlich',
        earlier: 'Früher',
        totalVisitsLabel: 'Gesamtbesuche:',
        uniqueVisitors: 'Einzigartige Besucher:',
        lastVisit: 'Letzter Besuch:',
        activeNow: '🟢 Aktiv in den letzten 24h',
        loading: 'Laden des 3D-Globus...'
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
        activeNow: '🟢 最近24小时活跃',
        loading: '加载3D地球仪...'
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
        activeNow: '🟢 過去24時間にアクティブ',
        loading: '3Dグローブを読み込み中...'
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
        activeNow: '🟢 지난 24시간 동안 활성',
        loading: '3D 지구본 로딩 중...'
      },
      ar: {
        mapTitle: '🌍 كرة الزوار المباشرة',
        cities: 'مدن',
        totalVisits: 'إجمالي الزيارات',
        last24Hours: 'آخر 24 ساعة',
        recent: 'حديث',
        earlier: 'سابق',
        totalVisitsLabel: 'إجمالي الزيارات:',
        uniqueVisitors: 'زوار فريدون:',
        lastVisit: 'آخر زيارة:',
        activeNow: '🟢 نشط في آخر 24 ساعة',
        loading: 'جاري تحميل الكرة الأرضية ثلاثية الأبعاد...'
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
        activeNow: '🟢 Son 24 saatte aktif',
        loading: '3D Küre Yükleniyor...'
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
        activeNow: '🟢 Ativo nas últimas 24h',
        loading: 'Carregando Globo 3D...'
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
        activeNow: '🟢 Активен за последние 24ч',
        loading: 'Загрузка 3D глобуса...'
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
        activeNow: '🟢 Attivo nelle ultime 24h',
        loading: 'Caricamento Globo 3D...'
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
        activeNow: '🟢 Actief in de laatste 24u',
        loading: '3D Globe Laden...'
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
        activeNow: '🟢 पिछले 24 घंटों में सक्रिय',
        loading: '3D ग्लोब लोड हो रहा है...'
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
          <div id="globalTooltip" class="global-tooltip"></div>
          
          <div class="loading" id="loading">${t.loading}</div>
          <div id="globeViz"></div>
          
          <div class="controls-overlay">
            <div class="control-btn" id="autoRotateBtn" title="Toggle Auto-Rotate">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </div>
            <div class="control-btn" id="resetViewBtn" title="Reset View">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v8m-4-4h8"/>
              </svg>
            </div>
          </div>
          
          <div class="zoom-controls" id="zoomControls">
            <button class="zoom-btn" id="zoomIn" title="Zoom In">+</button>
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
              <div class="legend-icon">
                <svg width="16" height="20" viewBox="0 0 24 34">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                        fill="${this.styleProps.markerRecent}"/>
                </svg>
              </div>
              <span>${t.recent}</span>
            </div>
            
            <div class="legend-item">
              <div class="legend-icon">
                <svg width="16" height="20" viewBox="0 0 24 34">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                        fill="${this.styleProps.markerOld}"/>
                </svg>
              </div>
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
  }

  getStyles() {
    const { 
      bgColor1, bgColor2, markerRecent, markerOld, badgeBg, badgeText, 
      tooltipBg, tooltipTitleColor, tooltipLabelColor, tooltipValueColor, tooltipHighlightColor,
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
      
      #globeViz canvas {
        display: block !important;
        outline: none !important;
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
        z-index: 10;
        pointer-events: none;
        text-align: center;
        max-width: 80%;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        animation: pulse 2s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
      
      .controls-overlay {
        position: absolute;
        top: 20px;
        left: 20px;
        display: flex;
        gap: 10px;
        z-index: 100;
      }
      
      .control-btn {
        width: 44px;
        height: 44px;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667eea;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .control-btn:hover {
        background: white;
        border-color: #667eea;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .control-btn.active {
        background: #667eea;
        color: white;
        border-color: #667eea;
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
        color: ${titleColor};
      }
      
      .global-tooltip {
        position: fixed;
        background: ${tooltipBg};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        pointer-events: none;
        z-index: 100000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        box-shadow: 0 8px 20px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
        white-space: nowrap;
        transform: translate(-50%, -100%);
        margin-top: -10px;
      }
      
      .global-tooltip.visible {
        opacity: 1;
        visibility: visible;
      }
      
      @media (max-width: 1024px) {
        .bottom-stats { padding: 12px 16px; }
        .stats-group { gap: 20px; }
        .stat-card { min-width: 80px; }
        .stat-value { font-size: 24px; }
        .stat-label { font-size: 11px; }
        .controls-overlay, .zoom-controls { top: 12px; }
        .control-btn { width: 40px; height: 40px; }
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
        .controls-overlay { top: 8px; left: 8px; gap: 6px; }
        .control-btn { width: 36px; height: 36px; }
        .zoom-controls { top: 8px; right: 8px; gap: 6px; }
        .zoom-btn { width: 32px; height: 32px; font-size: 16px; }
      }
      
      @media (max-width: 480px) {
        :host { min-height: 350px; }
        .globe-container { min-height: 350px; border-radius: 6px; }
        .stat-value { font-size: 18px; }
        .stat-label { font-size: 10px; }
        .stat-card { min-width: 60px; }
        .controls-overlay, .zoom-controls { top: 6px; }
        .control-btn, .zoom-btn { width: 28px; height: 28px; }
        .control-btn svg { width: 16px; height: 16px; }
        .zoom-btn { font-size: 14px; }
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
    const { countryFill, countryStroke } = this.styleProps;
    
    this.globe
      .globeMaterial(new window.THREE.MeshPhongMaterial({
        color: this.styleProps.bgColor1 || '#667eea',
        emissive: this.styleProps.bgColor1 || '#667eea',
        emissiveIntensity: 0.05,
        shininess: 0.7
      }))
      .atmosphereColor(countryStroke || '#667eea')
      .atmosphereAltitude(0.15);
    
    if (this.countriesData) {
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => countryFill || '#ffffff')
        .polygonSideColor(() => countryFill || '#ffffff')
        .polygonStrokeColor(() => countryStroke || '#667eea')
        .polygonAltitude(0.01);
    }
    
    const mapData = this.getAttribute('map-data');
    if (mapData) this.updateMarkers();
  }

  setupControls() {
    const autoRotateBtn = this.shadowRoot.getElementById('autoRotateBtn');
    const resetViewBtn = this.shadowRoot.getElementById('resetViewBtn');
    const zoomIn = this.shadowRoot.getElementById('zoomIn');
    const zoomOut = this.shadowRoot.getElementById('zoomOut');
    
    if (autoRotateBtn) {
      autoRotateBtn.classList.add('active');
      autoRotateBtn.addEventListener('click', () => {
        if (!this.globe) return;
        this.autoRotate = !this.autoRotate;
        this.globe.controls().autoRotate = this.autoRotate;
        autoRotateBtn.classList.toggle('active', this.autoRotate);
      });
    }
    
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => {
        if (!this.globe) return;
        this.globe.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
      });
    }
    
    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        if (!this.globe) return;
        const pov = this.globe.pointOfView();
        this.globe.pointOfView({ ...pov, altitude: Math.max(pov.altitude - 0.3, 1) }, 300);
      });
    }
    
    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        if (!this.globe) return;
        const pov = this.globe.pointOfView();
        this.globe.pointOfView({ ...pov, altitude: Math.min(pov.altitude + 0.3, 4) }, 300);
      });
    }
  }

  // ================================================================
  // CORE FIX: Library loading that works in Wix's sandboxed iframe
  // 
  // Problem: Wix custom elements run inside a sandboxed iframe.
  // Regular <script src="cdn-url"> appends to the iframe document
  // but may execute in a different window context, so window.THREE
  // is never set in the context where our code runs.
  //
  // Solution: Use fetch() to download script text, then execute it
  // via a Blob URL, which guarantees execution in the CURRENT
  // document's global scope.
  // ================================================================

  /**
   * Loads a library by fetching its source and executing it in the
   * current window context. Falls back to script tag if fetch fails.
   */
  async loadLibrary(globalName, urls) {
    // Check all possible global references first
    if (window[globalName] || self[globalName] || globalThis[globalName]) {
      // Normalize to window for consistent access
      if (!window[globalName]) {
        window[globalName] = self[globalName] || globalThis[globalName];
      }
      console.log(`✅ ${globalName} already available`);
      return;
    }

    const allUrls = Array.isArray(urls) ? urls : [urls];

    for (const url of allUrls) {
      // ---- METHOD 1: fetch + Blob URL (preferred for Wix iframe) ----
      try {
        console.log(`📥 [${globalName}] Fetching from ${url}...`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          mode: 'cors',
          cache: 'force-cache' // Use browser cache if available
        });
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const scriptText = await response.text();
        console.log(`📦 [${globalName}] Downloaded ${(scriptText.length / 1024).toFixed(0)}KB, executing via Blob...`);
        
        // Create a Blob URL and load it as a script tag
        // This ensures the script executes in the CURRENT document's global scope
        const blob = new Blob([scriptText], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = blobUrl;
          
          script.onload = () => {
            URL.revokeObjectURL(blobUrl);
            resolve();
          };
          script.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error('Blob script execution failed'));
          };
          
          document.head.appendChild(script);
        });
        
        // Brief wait for UMD module to assign globals
        await new Promise(r => setTimeout(r, 100));
        
        // Check all global references
        const ref = window[globalName] || self[globalName] || globalThis[globalName];
        if (ref) {
          if (!window[globalName]) window[globalName] = ref;
          console.log(`✅ [${globalName}] Loaded via fetch+blob from ${url}`);
          return;
        }
        
        console.warn(`⚠️ [${globalName}] Blob executed but global not found, trying next method...`);
      } catch (fetchErr) {
        console.warn(`⚠️ [${globalName}] Fetch+blob failed for ${url}:`, fetchErr.message);
      }

      // ---- METHOD 2: fetch + Function constructor (eval alternative) ----
      try {
        console.log(`📥 [${globalName}] Trying fetch+Function for ${url}...`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          mode: 'cors',
          cache: 'force-cache'
        });
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const scriptText = await response.text();
        
        // Execute using Function constructor - runs in global scope
        // The 'this' binding ensures UMD modules attach to window
        const fn = new Function(scriptText);
        fn.call(window);
        
        await new Promise(r => setTimeout(r, 100));
        
        const ref = window[globalName] || self[globalName] || globalThis[globalName];
        if (ref) {
          if (!window[globalName]) window[globalName] = ref;
          console.log(`✅ [${globalName}] Loaded via fetch+Function from ${url}`);
          return;
        }
        
        console.warn(`⚠️ [${globalName}] Function executed but global not found`);
      } catch (fnErr) {
        console.warn(`⚠️ [${globalName}] Fetch+Function failed for ${url}:`, fnErr.message);
      }

      // ---- METHOD 3: Traditional script tag (last resort) ----
      try {
        console.log(`📥 [${globalName}] Trying script tag for ${url}...`);
        
        // Remove any existing broken script tags for this URL
        const existing = document.querySelector(`script[src="${url}"]`);
        if (existing) existing.remove();
        
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          const loadTimeout = setTimeout(() => {
            script.onload = null;
            script.onerror = null;
            reject(new Error('Script tag timeout'));
          }, 20000);
          
          script.onload = () => {
            clearTimeout(loadTimeout);
            resolve();
          };
          script.onerror = () => {
            clearTimeout(loadTimeout);
            reject(new Error('Script tag error'));
          };
          
          document.head.appendChild(script);
        });
        
        // Extended polling for global availability
        const startTime = Date.now();
        while (Date.now() - startTime < 5000) {
          const ref = window[globalName] || self[globalName] || globalThis[globalName];
          if (ref) {
            if (!window[globalName]) window[globalName] = ref;
            console.log(`✅ [${globalName}] Loaded via script tag from ${url}`);
            return;
          }
          await new Promise(r => setTimeout(r, 100));
        }
        
        console.warn(`⚠️ [${globalName}] Script tag loaded but global not found`);
      } catch (scriptErr) {
        console.warn(`⚠️ [${globalName}] Script tag failed for ${url}:`, scriptErr.message);
      }
    }

    throw new Error(`Failed to load ${globalName} from all sources and methods`);
  }

  /**
   * Main library loading orchestrator with retry logic
   */
  async loadGlobeLibrary() {
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (this._destroyed) return;
        
        console.log(`📦 Loading Globe libraries (attempt ${attempt}/${maxAttempts})...`);
        
        const loading = this.shadowRoot.getElementById('loading');
        if (loading && attempt > 1) {
          loading.textContent = `Loading 3D Globe... (retry ${attempt - 1})`;
          loading.style.display = 'block';
          loading.style.opacity = '1';
          loading.style.visibility = 'visible';
        }

        // --- Load Three.js ---
        await this.loadLibrary('THREE', [
          'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
          'https://unpkg.com/three@0.160.0/build/three.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
        ]);
        console.log('✅ Three.js ready');

        if (this._destroyed) return;

        // --- Load TopoJSON ---
        await this.loadLibrary('topojson', [
          'https://cdn.jsdelivr.net/npm/topojson@3.0.2/dist/topojson.min.js',
          'https://unpkg.com/topojson@3.0.2/dist/topojson.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js'
        ]);
        console.log('✅ TopoJSON ready');

        if (this._destroyed) return;

        // --- Load Globe.GL ---
        await this.loadLibrary('Globe', [
          'https://cdn.jsdelivr.net/npm/globe.gl@2.27.2/dist/globe.gl.min.js',
          'https://unpkg.com/globe.gl@2.27.2/dist/globe.gl.min.js'
        ]);
        console.log('✅ Globe.GL ready');

        if (this._destroyed) return;

        // All libraries loaded — initialize globe
        await this.initializeGlobe();
        window.addEventListener('resize', this.handleResize);
        return; // Success

      } catch (error) {
        console.error(`❌ Library loading failed (attempt ${attempt}/${maxAttempts}):`, error.message);
        
        if (attempt < maxAttempts) {
          const waitMs = attempt * 2000;
          console.log(`⏳ Waiting ${waitMs}ms before retry...`);
          await new Promise(r => setTimeout(r, waitMs));
        } else {
          console.error('❌ All loading attempts failed');
          const loading = this.shadowRoot.getElementById('loading');
          if (loading) {
            loading.textContent = 'Failed to load globe. Tap to retry.';
            loading.style.color = '#ff6b6b';
            loading.style.cursor = 'pointer';
            loading.style.pointerEvents = 'auto';
            loading.onclick = () => {
              loading.textContent = this.getTranslations().loading;
              loading.style.color = 'white';
              loading.style.cursor = 'default';
              loading.style.pointerEvents = 'none';
              this.loadGlobeLibrary();
            };
          }
        }
      }
    }
  }

  handleResize() {
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      if (!this.globe) return;
      const container = this.shadowRoot.getElementById('globeViz');
      if (!container) return;
      this.globe.width(container.clientWidth).height(container.clientHeight);
    }, 250);
  }

  async initializeGlobe() {
    console.log('🌍 Initializing Globe.GL...');
    
    const container = this.shadowRoot.getElementById('globeViz');
    const loading = this.shadowRoot.getElementById('loading');
    
    if (!container) {
      console.error('❌ Globe container not found');
      return;
    }
    
    const { bgColor1, countryFill, countryStroke } = this.styleProps;
    
    try {
      if (loading) {
        loading.textContent = this.getTranslations().loading;
        loading.style.display = 'block';
        loading.style.opacity = '1';
        loading.style.visibility = 'visible';
        loading.style.color = 'white';
      }
      
      // Wait for container to have actual dimensions
      let waitCount = 0;
      while ((!container.clientWidth || !container.clientHeight) && waitCount < 30) {
        await new Promise(r => setTimeout(r, 100));
        waitCount++;
      }
      
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 400;
      
      this.globe = window.Globe({ animateIn: true })
        (container)
        .backgroundColor(bgColor1 || '#667eea')
        .globeMaterial(new window.THREE.MeshPhongMaterial({
          color: bgColor1 || '#667eea',
          emissive: bgColor1 || '#667eea',
          emissiveIntensity: 0.05,
          shininess: 0.7
        }))
        .atmosphereColor(countryStroke || '#667eea')
        .atmosphereAltitude(0.15)
        .width(width)
        .height(height)
        .pointOfView({ lat: 20, lng: 10, altitude: 2.5 });
      
      const controls = this.globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = true;
      controls.minDistance = 101;
      controls.maxDistance = 500;
      
      console.log('✅ Globe initialized, loading countries...');
      
      const success = await this.loadCountriesData(loading, countryFill, countryStroke);
      
      if (success && this.globe) {
        try {
          this.setupSmartScrolling(controls, container);
        } catch (scrollError) {
          console.warn('⚠️ Smart scrolling setup failed:', scrollError);
        }
      }
      
    } catch (error) {
      console.error('❌ Critical error initializing globe:', error);
      if (loading) {
        loading.textContent = 'Failed to initialize globe';
        loading.style.color = '#ff6b6b';
      }
    }
  }

  async loadCountriesData(loading, countryFill, countryStroke, retryCount = 0) {
    const maxRetries = 3;
    
    const worldDataUrls = [
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
      'https://unpkg.com/world-atlas@2/countries-110m.json'
    ];
    
    try {
      if (!window.topojson) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!window.topojson && retryCount < maxRetries) {
          return this.loadCountriesData(loading, countryFill, countryStroke, retryCount + 1);
        }
        if (!window.topojson) throw new Error('TopoJSON library not loaded');
      }
      
      if (loading) {
        loading.textContent = 'Loading world map...';
        loading.style.color = 'white';
        loading.style.display = 'block';
        loading.style.opacity = '1';
        loading.style.visibility = 'visible';
      }
      
      let worldData = null;
      let lastError = null;
      
      for (const url of worldDataUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          worldData = await response.json();
          console.log(`✅ World data loaded from: ${url}`);
          break;
        } catch (fetchErr) {
          lastError = fetchErr;
          console.warn(`⚠️ Failed to fetch from ${url}:`, fetchErr.message);
        }
      }
      
      if (!worldData) throw lastError || new Error('All world data URLs failed');
      
      this.countriesData = window.topojson.feature(worldData, worldData.objects.countries);
      console.log('✅ Countries data loaded:', this.countriesData.features.length, 'countries');
      
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => countryFill || '#ffffff')
        .polygonSideColor(() => countryFill || '#ffffff')
        .polygonStrokeColor(() => countryStroke || '#667eea')
        .polygonAltitude(0.01);
      
      // Hide loading
      if (loading && loading.parentNode) {
        loading.style.display = 'none';
        loading.style.opacity = '0';
        loading.style.visibility = 'hidden';
        loading.textContent = '';
        setTimeout(() => { if (loading && loading.parentNode) loading.remove(); }, 100);
      }
      
      // Load markers
      try {
        const mapData = this.getAttribute('map-data');
        if (mapData) this.updateMarkers();
      } catch (e) {
        console.warn('⚠️ Marker loading failed:', e);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error loading countries (attempt ' + (retryCount + 1) + '):', error);
      
      if (retryCount < maxRetries) {
        if (loading) {
          loading.textContent = `Loading... (retry ${retryCount + 1}/${maxRetries})`;
          loading.style.color = '#ffd700';
          loading.style.display = 'block';
          loading.style.opacity = '1';
          loading.style.visibility = 'visible';
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.loadCountriesData(loading, countryFill, countryStroke, retryCount + 1);
      }
      
      if (loading) {
        loading.textContent = 'Unable to load map. Click to refresh.';
        loading.style.color = '#ff6b6b';
        loading.style.cursor = 'pointer';
        loading.style.pointerEvents = 'auto';
        loading.onclick = () => window.location.reload();
      }
      
      try {
        const mapData = this.getAttribute('map-data');
        if (mapData) this.updateMarkers();
      } catch (e) {}
      
      return false;
    }
  }

  setupSmartScrolling(controls, container) {
    let isInteracting = false;
    let interactionTimeout = null;
    
    const onPointerDown = () => {
      isInteracting = true;
      controls.enableZoom = true;
      if (interactionTimeout) clearTimeout(interactionTimeout);
    };
    
    const onPointerUp = () => {
      interactionTimeout = setTimeout(() => {
        isInteracting = false;
        controls.enableZoom = false;
      }, 1000);
    };
    
    const onPointerMove = () => {
      if (isInteracting) {
        controls.enableZoom = true;
        if (interactionTimeout) clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => {
          isInteracting = false;
          controls.enableZoom = false;
        }, 1000);
      }
    };
    
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointermove', onPointerMove);
    
    container.addEventListener('wheel', (event) => {
      if (event.ctrlKey || event.metaKey || isInteracting) {
        controls.enableZoom = true;
        return;
      }
      controls.enableZoom = false;
    }, { passive: true });
    
    controls.enableZoom = false;
  }

  updateMarkers() {
    if (!this.globe) return;
    
    const mapData = this.getAttribute('map-data');
    if (!mapData) return;
    
    try {
      const locations = JSON.parse(mapData);
      const t = this.getTranslations();
      
      console.log('📍 Updating markers, total cities:', locations.length);
      if (locations.length === 0) return;
      
      const { markerRecent, markerOld, markerStyle, markerSize, showPulse, showVisitCount, badgeBg, badgeText, showTooltip } = this.styleProps;
      
      let recentCount = 0;
      let totalVisits = 0;
      
      locations.forEach(location => {
        if (location.isRecent) recentCount++;
        totalVisits += location.totalVisits || 0;
      });
      
      const tooltip = this.shadowRoot.getElementById('globalTooltip');
      
      this.globe
        .htmlElementsData(locations)
        .htmlLat(d => d.lat)
        .htmlLng(d => d.lng)
        .htmlAltitude(0.01)
        .htmlTransitionDuration(0)
        .htmlElement(d => {
          const el = document.createElement('div');
          el.className = 'marker-element';
          el.style.cssText = 'cursor: pointer; user-select: none; pointer-events: auto; display: inline-block;';
          
          const color = d.isRecent ? markerRecent : markerOld;
          const size = markerSize || 24;
          
          const badgeHtml = (topOffset, rightOffset) => {
            if (!showVisitCount || d.totalVisits <= 1) return '';
            return `<div style="position: absolute; top: ${topOffset}px; right: ${rightOffset}px; background: ${badgeBg}; color: ${badgeText}; 
                        border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; 
                        justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid ${color}; 
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none;">
              ${d.totalVisits > 99 ? '99+' : d.totalVisits}
            </div>`;
          };
          
          if (markerStyle === 'pin') {
            el.innerHTML = `
              <div style="position: relative; width: ${size}px; height: ${size + 10}px;">
                <svg width="${size}" height="${size + 10}" viewBox="0 0 24 34" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); display: block;">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" fill="${color}"/>
                </svg>
                ${badgeHtml(-8, -8)}
              </div>`;
          } else if (markerStyle === 'circle') {
            el.innerHTML = `
              <div style="position: relative; width: ${size}px; height: ${size}px;">
                <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
                ${badgeHtml(-6, -6)}
              </div>`;
          } else if (markerStyle === 'square') {
            el.innerHTML = `
              <div style="position: relative; width: ${size}px; height: ${size}px;">
                <div style="width: ${size}px; height: ${size}px; background: ${color}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: rotate(45deg);"></div>
                ${badgeHtml(-6, -6)}
              </div>`;
          } else if (markerStyle === 'star') {
            el.innerHTML = `
              <div style="position: relative; width: ${size}px; height: ${size}px;">
                <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); display: block;">
                  <path d="M12,2 L14.5,9.5 L22,10.5 L16.5,15.5 L18,23 L12,19 L6,23 L7.5,15.5 L2,10.5 L9.5,9.5 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
                </svg>
                ${badgeHtml(-6, -6)}
              </div>`;
          }
          
          if (showTooltip && tooltip) {
            el.addEventListener('mouseenter', () => {
              tooltip.innerHTML = `
                <strong style="color: ${this.styleProps.tooltipTitleColor}; font-size: 14px; display: block; margin-bottom: 6px;">📍 ${d.title}</strong>
                <div style="margin: 3px 0;">
                  <span style="color: ${this.styleProps.tooltipLabelColor};">${t.totalVisitsLabel}</span>
                  <span style="color: ${this.styleProps.tooltipValueColor}; font-weight: 600; margin-left: 8px;">${d.totalVisits}</span>
                </div>
                <div style="margin: 3px 0;">
                  <span style="color: ${this.styleProps.tooltipLabelColor};">${t.uniqueVisitors}</span>
                  <span style="color: ${this.styleProps.tooltipValueColor}; font-weight: 600; margin-left: 8px;">${d.visitorCount}</span>
                </div>
                <div style="margin: 3px 0;">
                  <span style="color: ${this.styleProps.tooltipLabelColor};">${t.lastVisit}</span>
                  <span style="color: ${this.styleProps.tooltipValueColor}; font-weight: 600; margin-left: 8px;">${d.lastVisit}</span>
                </div>
                ${d.isRecent ? `<div style="background: rgba(72, 187, 120, 0.2); padding: 4px 8px; border-radius: 4px; margin-top: 6px; text-align: center; color: ${this.styleProps.tooltipHighlightColor}; font-weight: 600;">${t.activeNow}</div>` : ''}
              `;
              tooltip.classList.add('visible');
            });
            
            el.addEventListener('mousemove', (e) => {
              tooltip.style.left = e.clientX + 'px';
              tooltip.style.top = e.clientY + 'px';
            });
            
            el.addEventListener('mouseleave', () => {
              tooltip.classList.remove('visible');
            });
          }
          
          return el;
        });
      
      if (showPulse) {
        const ringsData = locations
          .filter(loc => loc.isRecent)
          .map(location => ({
            lat: location.lat,
            lng: location.lng,
            maxR: 5,
            propagationSpeed: 3,
            repeatPeriod: 1200
          }));
        
        this.globe
          .ringsData(ringsData)
          .ringColor(() => markerRecent)
          .ringMaxRadius('maxR')
          .ringPropagationSpeed('propagationSpeed')
          .ringRepeatPeriod('repeatPeriod')
          .ringAltitude(0.015);
      } else {
        this.globe.ringsData([]);
      }
      
      const cityCountEl = this.shadowRoot.getElementById('cityCount');
      const totalVisitsEl = this.shadowRoot.getElementById('totalVisits');
      const recentCountEl = this.shadowRoot.getElementById('recentCount');
      
      if (cityCountEl) cityCountEl.textContent = locations.length;
      if (totalVisitsEl) totalVisitsEl.textContent = totalVisits;
      if (recentCountEl) recentCountEl.textContent = recentCount;
      
    } catch (error) {
      console.error('❌ Error updating markers:', error);
    }
  }
}

customElements.define('d3-globe-element', D3GlobeElement);
console.log('✅ d3-globe-element registered');

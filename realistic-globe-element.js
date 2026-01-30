class RealisticGlobeElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.globe = null;
    this.handleResize = this.handleResize.bind(this);
    this.resizeTimeout = null;
    this.initialRenderDone = false;
    this.autoRotate = true;
    this.stars = null;
    
    // Parse initial style props if available
    const initialStyleProps = this.getAttribute('style-props');
    this.styleProps = initialStyleProps ? JSON.parse(initialStyleProps) : this.getDefaultStyleProps();
    
    console.log('✅ RealisticGlobeElement: Constructor called with props:', this.styleProps);
  }

  getDefaultStyleProps() {
    return {
      bgColor1: '#0a0e27',
      bgColor2: '#1a1f3a',
      showStarfield: true,
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
    console.log('✅ RealisticGlobeElement: Connected to DOM');
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
        loading: 'Loading Realistic Globe...'
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
        loading: 'Cargando Globo Realista...'
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
        loading: 'Chargement du Globe Réaliste...'
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
        loading: 'Laden des realistischen Globus...'
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
        loading: '加载真实地球仪...'
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
        loading: 'リアルグローブを読み込み中...'
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
        loading: '실사 지구본 로딩 중...'
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
        loading: 'جاري تحميل الكرة الأرضية الواقعية...'
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
        loading: 'Gerçekçi Küre Yükleniyor...'
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
        loading: 'Carregando Globo Realista...'
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
        loading: 'Загрузка реалистичного глобуса...'
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
        loading: 'Caricamento Globo Realistico...'
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
        loading: 'Realistische Globe Laden...'
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
        loading: 'यथार्थवादी ग्लोब लोड हो रहा है...'
      }
    };
    
    const lang = this.styleProps.language || 'en';
    return translations[lang] || translations.en;
  }

  render() {
    console.log('🎨 Rendering Realistic Globe with styles:', this.styleProps);
    
    const styles = this.getStyles();
    const t = this.getTranslations();
    
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="globe-container">
        <div id="globalTooltip" class="global-tooltip"></div>
        
        <div class="globe-wrapper" id="globeWrapper">
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
      titleColor, statsValueColor, statsLabelColor, statsBgColor, legendTextColor, showStarfield
    } = this.styleProps;
    
    // Background style changes based on starfield toggle
    const backgroundStyle = showStarfield 
      ? `background: #000000;` 
      : `background: linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%);`;
    
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
        ${backgroundStyle}
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
        
        .controls-overlay, .zoom-controls {
          top: 12px;
        }
        
        .control-btn {
          width: 40px;
          height: 40px;
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
        
        .controls-overlay {
          top: 8px;
          left: 8px;
          gap: 6px;
        }
        
        .control-btn {
          width: 36px;
          height: 36px;
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
        
        .controls-overlay, .zoom-controls {
          top: 6px;
        }
        
        .control-btn, .zoom-btn {
          width: 28px;
          height: 28px;
        }
        
        .control-btn svg {
          width: 16px;
          height: 16px;
        }
        
        .zoom-btn {
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

  updateGlobeStyles() {
    console.log('🎨 Updating globe styles...');
    
    if (!this.globe) return;
    
    const { showStarfield, bgColor1 } = this.styleProps;
    
    // Update background
    const container = this.shadowRoot.querySelector('.globe-container');
    if (container) {
      if (showStarfield) {
        container.style.background = '#000000';
        this.createStarfield();
      } else {
        container.style.background = `linear-gradient(135deg, ${this.styleProps.bgColor1} 0%, ${this.styleProps.bgColor2} 100%)`;
        this.removeStarfield();
      }
    }
    
    // Globe background color
    this.globe.backgroundColor(showStarfield ? '#000000' : bgColor1);
    
    // Update markers with new colors
    const mapData = this.getAttribute('map-data');
    if (mapData) {
      this.updateMarkers();
    }
  }

  createStarfield() {
    if (!this.globe || this.stars) return;
    
    const scene = this.globe.scene();
    const starCount = 2000;
    
    // Create star geometry
    const starGeometry = new window.THREE.BufferGeometry();
    const starPositions = [];
    const starSizes = [];
    
    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      starPositions.push(x, y, z);
      starSizes.push(Math.random() * 1.5 + 0.5); // Random sizes 0.5-2.0
    }
    
    starGeometry.setAttribute('position', new window.THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new window.THREE.Float32BufferAttribute(starSizes, 1));
    
    // Create star material with better rendering
    const starMaterial = new window.THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      map: this.createStarTexture(),
      blending: window.THREE.AdditiveBlending,
      depthWrite: false
    });
    
    // Create and add stars to scene
    this.stars = new window.THREE.Points(starGeometry, starMaterial);
    scene.add(this.stars);
    
    console.log('✨ Starfield created with', starCount, 'stars');
  }

  createStarTexture() {
    // Create a circular star texture to avoid square artifacts
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new window.THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }

  removeStarfield() {
    if (!this.globe || !this.stars) return;
    
    const scene = this.globe.scene();
    scene.remove(this.stars);
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.stars = null;
    
    console.log('🌑 Starfield removed');
  }

  setupControls() {
    const autoRotateBtn = this.shadowRoot.getElementById('autoRotateBtn');
    const resetViewBtn = this.shadowRoot.getElementById('resetViewBtn');
    const zoomIn = this.shadowRoot.getElementById('zoomIn');
    const zoomOut = this.shadowRoot.getElementById('zoomOut');
    
    if (autoRotateBtn) {
      autoRotateBtn.classList.add('active'); // Start with auto-rotate on
      autoRotateBtn.addEventListener('click', () => {
        if (!this.globe) return;
        this.autoRotate = !this.autoRotate;
        this.globe.controls().autoRotate = this.autoRotate;
        
        if (this.autoRotate) {
          autoRotateBtn.classList.add('active');
        } else {
          autoRotateBtn.classList.remove('active');
        }
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

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        }
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        script.dataset.loaded = 'true';
        console.log(`✅ Script loaded: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  async loadGlobeLibrary() {
    try {
      console.log('📦 Loading Globe.GL library...');
      
      // Load Three.js first (required by Globe.GL)
      if (!window.THREE) {
        await this.loadScript('https://unpkg.com/three@0.160.0/build/three.min.js');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!window.THREE) {
        throw new Error('Three.js failed to load');
      }
      console.log('✅ Three.js loaded');
      
      // Load Globe.GL
      if (!window.Globe) {
        await this.loadScript('//unpkg.com/globe.gl');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!window.Globe) {
        throw new Error('Globe.GL failed to load');
      }
      console.log('✅ Globe.GL loaded');
      
      await this.initializeGlobe();
      window.addEventListener('resize', this.handleResize);
      
    } catch (error) {
      console.error('❌ Error loading libraries:', error);
      this.shadowRoot.getElementById('loading').textContent = 'Error loading globe';
    }
  }

  handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      if (!this.globe) return;
      
      console.log('🔄 Handling resize...');
      const container = this.shadowRoot.getElementById('globeViz');
      
      this.globe
        .width(container.clientWidth)
        .height(container.clientHeight);
      
      console.log('✅ Resize complete');
    }, 250);
  }

  async initializeGlobe() {
    console.log('🌍 Initializing Realistic Globe...');
    
    const container = this.shadowRoot.getElementById('globeViz');
    const loading = this.shadowRoot.getElementById('loading');
    
    const { showStarfield, bgColor1 } = this.styleProps;
    
    // Initialize Globe with realistic Earth texture
    this.globe = window.Globe({ animateIn: true })
      (container)
      .backgroundColor(showStarfield ? '#000000' : bgColor1)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .width(container.clientWidth)
      .height(container.clientHeight)
      .pointOfView({ lat: 20, lng: 10, altitude: 2.5 });
    
    // Configure controls
    this.globe.controls().autoRotate = true;
    this.globe.controls().autoRotateSpeed = 0.5;
    this.globe.controls().enableZoom = true;
    this.globe.controls().minDistance = 101;
    this.globe.controls().maxDistance = 500;
    
    // Create starfield if enabled
    if (showStarfield) {
      setTimeout(() => this.createStarfield(), 500);
    }
    
    loading.style.display = 'none';
    
    console.log('✅ Realistic Globe initialized');
    
    // Load initial data if available
    const mapData = this.getAttribute('map-data');
    if (mapData) {
      console.log('📍 Initial map data found, rendering markers');
      this.updateMarkers();
    }
  }

  updateMarkers() {
    if (!this.globe) {
      console.log('⏳ Globe not initialized yet');
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
      
      const { markerRecent, markerOld, markerStyle, markerSize, showPulse, showVisitCount, badgeBg, badgeText, showTooltip } = this.styleProps;
      
      // Calculate stats
      let recentCount = 0;
      let totalVisits = 0;
      
      locations.forEach(location => {
        if (location.isRecent) recentCount++;
        totalVisits += location.totalVisits || 0;
      });
      
      // Create HTML labels for markers with different styles
      this.globe
        .htmlElementsData(locations)
        .htmlLat(d => d.lat)
        .htmlLng(d => d.lng)
        .htmlAltitude(0.005) // Reduced altitude to keep markers closer to Earth
        .htmlElement(d => {
          const el = document.createElement('div');
          el.style.cssText = 'cursor: pointer; user-select: none; pointer-events: auto; position: relative;';
          
          const color = d.isRecent ? markerRecent : markerOld;
          const size = markerSize || 24;
          
          // Create marker container
          const markerContainer = document.createElement('div');
          markerContainer.className = 'marker-container';
          markerContainer.style.cssText = 'position: relative; display: inline-block;';
          
          // Create marker based on style
          if (markerStyle === 'pin') {
            markerContainer.innerHTML = `
              <div class="marker-icon" style="position: relative; width: ${size}px; height: ${size + 10}px;">
                <svg width="${size}" height="${size + 10}" viewBox="0 0 24 34" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); transform-origin: center bottom;">
                  <path d="M12 0C7.58 0 4 3.58 4 8c0 5.5 8 13 8 13s8-7.5 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" 
                        fill="${color}"/>
                </svg>
                ${showVisitCount && d.totalVisits > 1 ? `
                  <div class="visit-badge" style="position: absolute; top: -8px; right: -8px; background: ${badgeBg}; color: ${badgeText}; 
                              border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; 
                              justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid ${color}; 
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: none;">
                    ${d.totalVisits > 99 ? '99+' : d.totalVisits}
                  </div>
                ` : ''}
              </div>
            `;
          } else if (markerStyle === 'circle') {
            markerContainer.innerHTML = `
              <div class="marker-icon" style="position: relative; width: ${size}px; height: ${size}px;">
                <div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; 
                            border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
                ${showVisitCount && d.totalVisits > 1 ? `
                  <div class="visit-badge" style="position: absolute; top: -6px; right: -6px; background: ${badgeBg}; color: ${badgeText}; 
                              border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; 
                              justify-content: center; font-size: 9px; font-weight: bold; border: 2px solid ${color}; pointer-events: none;">
                    ${d.totalVisits > 99 ? '99+' : d.totalVisits}
                  </div>
                ` : ''}
              </div>
            `;
          } else if (markerStyle === 'square') {
            markerContainer.innerHTML = `
              <div class="marker-icon" style="position: relative; width: ${size}px; height: ${size}px;">
                <div style="width: ${size}px; height: ${size}px; background: ${color}; 
                            border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: rotate(45deg);"></div>
                ${showVisitCount && d.totalVisits > 1 ? `
                  <div class="visit-badge" style="position: absolute; top: -6px; right: -6px; background: ${badgeBg}; color: ${badgeText}; 
                              border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; 
                              justify-content: center; font-size: 9px; font-weight: bold; border: 2px solid ${color}; z-index: 10; pointer-events: none;">
                    ${d.totalVisits > 99 ? '99+' : d.totalVisits}
                  </div>
                ` : ''}
              </div>
            `;
          } else if (markerStyle === 'star') {
            markerContainer.innerHTML = `
              <div class="marker-icon" style="position: relative; width: ${size}px; height: ${size}px;">
                <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                  <path d="M12,2 L14.5,9.5 L22,10.5 L16.5,15.5 L18,23 L12,19 L6,23 L7.5,15.5 L2,10.5 L9.5,9.5 Z" 
                        fill="${color}" stroke="white" stroke-width="1.5"/>
                </svg>
                ${showVisitCount && d.totalVisits > 1 ? `
                  <div class="visit-badge" style="position: absolute; top: -6px; right: -6px; background: ${badgeBg}; color: ${badgeText}; 
                              border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; 
                              justify-content: center; font-size: 9px; font-weight: bold; border: 2px solid ${color}; pointer-events: none;">
                    ${d.totalVisits > 99 ? '99+' : d.totalVisits}
                  </div>
                ` : ''}
              </div>
            `;
          }
          
          el.appendChild(markerContainer);
          
          // Add tooltip on hover if enabled - FIXED VERSION
          if (showTooltip) {
            let tooltipDiv = null;
            
            const showTooltipFn = () => {
              // Remove any existing tooltip first
              if (tooltipDiv) {
                tooltipDiv.remove();
                tooltipDiv = null;
              }
              
              // Create new tooltip
              tooltipDiv = document.createElement('div');
              tooltipDiv.className = 'marker-tooltip';
              tooltipDiv.style.cssText = `
                position: absolute; 
                bottom: 100%; 
                left: 50%; 
                transform: translateX(-50%); 
                background: ${this.styleProps.tooltipBg}; 
                color: white; 
                padding: 12px 16px; 
                border-radius: 8px; 
                white-space: nowrap; 
                pointer-events: none; 
                z-index: 10000;
                box-shadow: 0 8px 20px rgba(0,0,0,0.4); 
                border: 1px solid rgba(255,255,255,0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                font-size: 12px; 
                margin-bottom: 8px;
              `;
              
              tooltipDiv.innerHTML = `
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
              
              el.appendChild(tooltipDiv);
              el.style.zIndex = '1000';
            };
            
            const hideTooltipFn = () => {
              if (tooltipDiv) {
                tooltipDiv.remove();
                tooltipDiv = null;
              }
              el.style.zIndex = 'auto';
            };
            
            el.addEventListener('mouseenter', showTooltipFn);
            el.addEventListener('mouseleave', hideTooltipFn);
          }
          
          return el;
        });
      
      // Add VISIBLE pulse rings for recent visitors
      if (showPulse) {
        const ringsData = locations
          .filter(loc => loc.isRecent)
          .map(location => ({
            lat: location.lat,
            lng: location.lng,
            maxR: 5, // Larger radius
            propagationSpeed: 3, // Faster
            repeatPeriod: 1200 // More frequent
          }));
        
        this.globe
          .ringsData(ringsData)
          .ringColor(() => markerRecent)
          .ringMaxRadius('maxR')
          .ringPropagationSpeed('propagationSpeed')
          .ringRepeatPeriod('repeatPeriod')
          .ringAltitude(0.015); // Slightly raised for visibility
      } else {
        this.globe.ringsData([]);
      }
      
      console.log('\n📊 STATISTICS');
      console.log('Cities:', locations.length);
      console.log('Total Visits:', totalVisits);
      console.log('Recent (24h):', recentCount);
      console.log('======================================\n');
      
      // Update stats display
      this.shadowRoot.getElementById('cityCount').textContent = locations.length;
      this.shadowRoot.getElementById('totalVisits').textContent = totalVisits;
      this.shadowRoot.getElementById('recentCount').textContent = recentCount;
      
    } catch (error) {
      console.error('❌ Error updating markers:', error);
    }
  }
}

customElements.define('realistic-globe-element', RealisticGlobeElement);
console.log('✅ realistic-globe-element registered');

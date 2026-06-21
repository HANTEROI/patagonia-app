// ─── js/ui.js ────────────────────────────────────────────────────────────────

function catInfo(id) { return PIN_CATEGORIES.find(c => c.id === id) || PIN_CATEGORIES[0]; }
let activeFilter = "all";

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  if (state.lightbox) { app.innerHTML = renderLightbox(); return; }

  const done    = Object.values(state.checked).filter(Boolean).length;
  const resDone = Object.values(state.reservas).filter(Boolean).length;
  const pct     = state.days.length ? Math.round(done / state.days.length * 100) : 0;

  app.innerHTML = `
    ${state.editing    ? renderEditModal()    : ""}
    ${state.adding     ? renderAddModal()     : ""}
    ${state.addingPin  ? renderAddPinModal()  : ""}
    ${state.editingPin ? renderEditPinModal() : ""}

    <div class="topbar">
      <div class="topbar-inner">
        <div class="topbar-brand">
          <div>
            <div class="topbar-eyebrow">Roteiro Compartilhado</div>
            <h1 class="topbar-title">Patagônia <span>16/12 – 12/01</span></h1>
          </div>
        </div>
        <div class="topbar-right">
          ${state.token
            ? `<div class="progress-pill">
                 <span class="progress-text">${done}/${state.days.length} dias</span>
                 <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
               </div>`
            : `<button class="btn-drive" onclick="signIn()">🔗 Google Drive</button>`}
          <button class="btn-icon" onclick="setState({adding:true})">＋ Dia</button>
          <button class="btn-icon" onclick="openAddPin()">📍 Ponto</button>
        </div>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab ${state.view==='map'      ? 'active':''}" onclick="setState({view:'map'})">🗺️ Mapa</button>
        <button class="nav-tab ${state.view==='roteiro'  ? 'active':''}" onclick="setState({view:'roteiro'})">📅 Roteiro</button>
        <button class="nav-tab ${state.view==='pontos'   ? 'active':''}" onclick="setState({view:'pontos'})">📍 Pontos</button>
        <button class="nav-tab ${state.view==='reservas' ? 'active':''}" onclick="setState({view:'reservas'})">✅ Reservas</button>
        ${state.token ? `<button class="nav-tab ${state.view==='usuarios'?'active':''} ml-auto" onclick="setState({view:'usuarios'})">👥</button>` : ""}
      </div>
    </div>

    <div class="content${state.view!=='map' ? ' full-scroll' : ''}" id="main-content">
      ${state.view==='map'      ? renderMapView()      : ""}
      ${state.view==='roteiro'  ? renderListView()     : ""}
      ${state.view==='pontos'   ? renderPontosView()   : ""}
      ${state.view==='reservas' ? renderReservasView() : ""}
      ${state.view==='usuarios' ? renderUsuariosView() : ""}
    </div>
  `;

  if (state.view === "map") {
    requestAnimationFrame(() => {
      initMap();
      updateMapMarkers();
      if (state.selectedId && mapInst) {
        const d = state.days.find(x => x.id === state.selectedId);
        if (d) mapInst.setView([d.lat, d.lng], 9, { animate: true });
      }
    });
  }
}

// ─── MAP VIEW ────────────────────────────────────────────────────────────────
function renderMapView() {
  const sel = state.days.find(d => d.id === state.selectedId);
  const selPin = state.selectedPinId ? (state.pins||[]).find(p => p.id === state.selectedPinId) : null;
  const done = Object.values(state.checked).filter(Boolean).length;

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-meta">🌎 ${state.days.length} dias · ${(state.pins||[]).length} pontos · ${done} concluídos</div>
        <div class="sidebar-search-wrap">
          <span class="sidebar-search-icon">🔍</span>
          <input class="sidebar-search" placeholder="Buscar dia ou local..."
                 oninput="filterSidebar(this.value)" id="sidebar-search"/>
        </div>
      </div>
      <div class="sidebar-filters">
        <span class="filter-chip ${activeFilter==='all'?'active':''}"      onclick="setFilter('all')">Todos</span>
        <span class="filter-chip ${activeFilter==='pendente'?'active':''}" onclick="setFilter('pendente')">Pendentes</span>
        <span class="filter-chip ${activeFilter==='feito'?'active':''}"    onclick="setFilter('feito')">Concluídos</span>
      </div>
      <div class="sidebar-list" id="sidebar-list">
        ${state.days.length === 0
          ? `<div class="empty-state">
               <div class="empty-icon">🗺️</div>
               <div class="empty-title">Roteiro vazio</div>
               <div class="empty-sub">Clique em <b>＋ Dia</b> para começar a montar sua rota</div>
             </div>`
          : renderSidebarItems(state.days)}
      </div>
    </div>

    <div class="map-panel">
      <div id="map"></div>

      ${sel ? `
        <div class="detail-drawer" id="detail-drawer">
          <div class="drawer-drag"><div class="drawer-handle"></div></div>
          <div class="drawer-topbar">
            <div>
              <div class="detail-region">${sel.region || ''}</div>
              <div class="detail-title">${sel.emoji || ''} ${sel.title}</div>
              <div class="detail-meta">📍 ${sel.stays} &nbsp;·&nbsp; 🚗 ${sel.drive}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="drawer-edit-btn" onclick="openEdit(${sel.id})">✏️ Editar</button>
              <button class="drawer-close" onclick="setState({selectedId:null})">✕</button>
            </div>
          </div>
          <div class="drawer-body">
            ${(sel.highlights||[]).map(h=>`
              <div class="highlight-item">
                <span class="hl-arrow" style="color:${REGION_COLORS[sel.region]||'var(--accent)'}">→</span>${h}
              </div>`).join("")}
            ${sel.tip   ? `<div class="box-tip">💡 ${sel.tip}</div>`   : ""}
            ${sel.paleo ? `<div class="box-paleo">${sel.paleo}</div>` : ""}
            ${sel.alert ? `<div class="box-alert">${sel.alert}</div>` : ""}

            ${renderLinkedPins(sel.id)}

            ${state.token ? renderMediaSection(sel) : `<div class="drive-cta"><p>🔗 Conecte o Google Drive para fotos e diário</p><button class="btn-drive" onclick="signIn()">Conectar</button></div>`}
          </div>
        </div>` : selPin ? `
        <div class="detail-drawer" id="detail-drawer">
          <div class="drawer-drag"><div class="drawer-handle"></div></div>
          <div class="drawer-topbar">
            <div>
              <span class="point-cat-badge ${catInfo(selPin.category).cls}" style="margin-bottom:4px;display:inline-flex">${catInfo(selPin.category).label}</span>
              <div class="detail-title">${selPin.label}</div>
              ${selPin.price    ? `<div class="detail-meta">💰 ${selPin.price}</div>` : ""}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="drawer-edit-btn" onclick="setState({editingPin:${JSON.stringify(selPin).replace(/"/g,'&quot;')}})">✏️</button>
              <button class="drawer-close" onclick="setState({selectedPinId:null})">✕</button>
            </div>
          </div>
          <div class="drawer-body">
            ${selPin.duration ? `<div class="highlight-item"><span class="hl-arrow">⏱</span>${selPin.duration}</div>` : ""}
            ${selPin.hours    ? `<div class="highlight-item"><span class="hl-arrow">🕐</span>${selPin.hours}</div>`    : ""}
            ${selPin.lat && selPin.lng ? `<div class="point-coords" onclick="copyCoords(${selPin.lat},${selPin.lng})">📌 ${parseFloat(selPin.lat).toFixed(5)}, ${parseFloat(selPin.lng).toFixed(5)} · copiar</div>` : ""}
            ${selPin.link ? `<div style="margin-top:8px"><a class="point-link" href="${selPin.link}" target="_blank">🔗 Link de reserva</a></div>` : ""}
            ${selPin.note ? `<div class="box-tip" style="margin-top:10px">${selPin.note}</div>` : ""}
            ${selPin.dayId ? `<div style="margin-top:10px;font-size:11px;color:var(--text3)">📅 Vinculado ao dia: <b style="color:var(--text2)">${state.days.find(d=>d.id==selPin.dayId)?.title||'—'}</b></div>` : ""}
          </div>
        </div>` : `
        <div class="map-hint-float">💡 Clique num marcador · Clique no mapa para adicionar ponto</div>`}
    </div>
  `;
}

// ─── LINKED PINS (pontos vinculados a um dia) ─────────────────────────────────
function renderLinkedPins(dayId) {
  const linked = (state.pins||[]).filter(p => p.dayId == dayId);
  return `
    <div style="margin-top:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text3);font-weight:600">Pontos deste dia (${linked.length})</span>
        <button class="btn-icon" style="font-size:11px;padding:3px 8px" onclick="openAddPinForDay(${dayId})">＋ Adicionar</button>
      </div>
      ${linked.length ? linked.map(p => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg2);border-radius:var(--radius);margin-bottom:4px;cursor:pointer"
             onclick="setState({selectedPinId:'${p.id}',selectedId:null})">
          <span class="point-cat-badge ${catInfo(p.category).cls}" style="font-size:10px">${catInfo(p.category).label.split(' ')[0]}</span>
          <span style="font-size:12px;font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.label}</span>
          ${p.price ? `<span style="font-size:11px;color:var(--text3)">${p.price}</span>` : ""}
        </div>`).join("") : `<div style="font-size:12px;color:var(--text3);padding:8px 0">Nenhum ponto vinculado a este dia ainda.</div>`}
    </div>
  `;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function renderSidebarItems(days) {
  let filtered = days;
  if (activeFilter === "pendente") filtered = days.filter(d => !state.checked[d.id]);
  if (activeFilter === "feito")    filtered = days.filter(d =>  state.checked[d.id]);
  if (!filtered.length) return `<div class="empty-state"><div class="empty-sub">Nenhum resultado</div></div>`;

  const regions = [...new Set(filtered.map(d => d.region))];
  return regions.map(region => {
    const color = REGION_COLORS[region] || "#888";
    return `
      <div class="region-group">
        <div class="region-divider">
          <div class="region-line" style="background:${color}"></div>
          <span class="region-label" style="color:${color}">${region}</span>
          <div class="region-line" style="background:${color}"></div>
        </div>
        ${filtered.filter(d => d.region === region).map(d => renderDayRow(d, false)).join("")}
      </div>`;
  }).join("");
}

// ─── DAY ROW ─────────────────────────────────────────────────────────────────
function renderDayRow(day, expandable) {
  const color  = REGION_COLORS[day.region] || "#888";
  const isSel  = day.id === state.selectedId;
  const isDone = state.checked[day.id];
  const linkedCount = (state.pins||[]).filter(p => p.dayId == day.id).length;

  if (!expandable) {
    return `
      <div class="day-row ${isDone?"done":""} ${isSel?"selected":""}" onclick="selectDay(${day.id})">
        <button class="day-check ${isDone?"checked":""}" onclick="event.stopPropagation();toggleCheck(${day.id})">✓</button>
        <div class="day-bar" style="background:${color}"></div>
        <span class="day-emoji">${day.emoji||'📍'}</span>
        <div class="day-info">
          <div class="day-meta"><span class="day-date">${day.date}</span><span class="day-drive">${day.drive}</span></div>
          <div class="day-title">${day.title}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:1px">
            <span class="day-stays">📍 ${day.stays}</span>
            ${linkedCount ? `<span style="font-size:9px;background:var(--accent-l);color:var(--accent);border-radius:99px;padding:1px 6px;font-weight:600">${linkedCount} ponto${linkedCount>1?'s':''}</span>` : ""}
          </div>
        </div>
        <button class="day-edit-btn" onclick="event.stopPropagation();openEdit(${day.id})">✏️</button>
      </div>`;
  }

  return `
    <div class="day-card ${isDone?"done":""} ${isSel?"selected":""}" onclick="toggleSelect(${day.id})">
      <div class="day-header">
        <button class="day-check ${isDone?"checked":""}" onclick="event.stopPropagation();toggleCheck(${day.id})">✓</button>
        <div class="day-bar" style="background:${color}"></div>
        <span class="day-emoji">${day.emoji||'📍'}</span>
        <div class="day-info">
          <div class="day-meta"><span class="day-date">${day.date}</span><span class="day-drive">${day.drive}</span></div>
          <div class="day-title">${day.title}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:1px">
            <span class="day-stays">📍 ${day.stays}</span>
            ${linkedCount ? `<span style="font-size:9px;background:var(--accent-l);color:var(--accent);border-radius:99px;padding:1px 6px;font-weight:600">${linkedCount} ponto${linkedCount>1?'s':''}</span>` : ""}
          </div>
        </div>
        <button class="day-edit-btn" onclick="event.stopPropagation();openEdit(${day.id})">✏️</button>
      </div>
      ${isSel ? renderDetailPanel(day) : ""}
    </div>`;
}

// ─── LIST VIEW ───────────────────────────────────────────────────────────────
function renderListView() {
  if (!state.days.length) return `
    <div class="empty-state" style="margin-top:60px">
      <div class="empty-icon">📅</div>
      <div class="empty-title">Nenhum dia no roteiro</div>
      <div class="empty-sub">Clique em <b>＋ Dia</b> no topo para adicionar</div>
      <button class="btn-drive" style="margin-top:16px" onclick="setState({adding:true})">＋ Adicionar primeiro dia</button>
    </div>`;

  const regions = [...new Set(state.days.map(d => d.region))];
  return `<div class="day-list">` + regions.map(region => {
    const color = REGION_COLORS[region] || "#888";
    return `
      <div class="region-group" style="margin-bottom:20px">
        <div class="region-divider">
          <div class="region-line" style="background:${color}"></div>
          <span class="region-label" style="color:${color}">${region}</span>
          <div class="region-line" style="background:${color}"></div>
        </div>
        ${state.days.filter(d => d.region === region).map(d => renderDayRow(d, true)).join("")}
      </div>`;
  }).join("") + `</div>`;
}

// ─── DETAIL PANEL (aba Roteiro) ───────────────────────────────────────────────
function renderDetailPanel(day) {
  const color = REGION_COLORS[day.region] || "#888";
  return `
    <div class="detail-panel" style="border-left:3px solid ${color}">
      <div class="detail-header">
        <div>
          <div class="detail-region">${day.region}</div>
          <div class="detail-title">${day.emoji||''} ${day.title}</div>
          <div class="detail-meta">📍 ${day.stays} · 🚗 ${day.drive}</div>
        </div>
        <button onclick="openEdit(${day.id})" class="btn-edit-sm">✏️ Editar</button>
      </div>
      ${(day.highlights||[]).map(h=>`<div class="highlight-item"><span class="hl-arrow" style="color:${color}">→</span>${h}</div>`).join("")}
      ${day.tip   ? `<div class="box-tip">💡 ${day.tip}</div>`   : ""}
      ${day.paleo ? `<div class="box-paleo">${day.paleo}</div>` : ""}
      ${day.alert ? `<div class="box-alert">${day.alert}</div>` : ""}

      ${renderLinkedPins(day.id)}

      ${state.token ? renderMediaSection(day) : `<div class="drive-cta"><p>🔗 Conecte o Google Drive</p><button class="btn-drive" onclick="signIn()">Conectar</button></div>`}
    </div>`;
}

// ─── PONTOS VIEW ─────────────────────────────────────────────────────────────
function renderPontosView() {
  const filter = state.pontosFilter || "all";
  const search = (state.pontosSearch || "").toLowerCase();
  let pts = state.pins || [];
  if (filter !== "all") pts = pts.filter(p => p.category === filter);
  if (search) pts = pts.filter(p => p.label.toLowerCase().includes(search) || (p.note||"").toLowerCase().includes(search));

  return `
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <div style="position:relative;flex:1;min-width:200px">
          <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text3)">🔍</span>
          <input class="field-input" style="margin:0;padding-left:30px" placeholder="Buscar pontos..."
                 value="${state.pontosSearch||''}" oninput="setState({pontosSearch:this.value})" />
        </div>
        <button class="btn-drive" onclick="openAddPin()">＋ Novo ponto</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <span class="filter-chip ${filter==='all'?'active':''}" onclick="setState({pontosFilter:'all'})">Todos (${(state.pins||[]).length})</span>
        ${PIN_CATEGORIES.map(c => {
          const n = (state.pins||[]).filter(p => p.category === c.id).length;
          if (!n) return "";
          return `<span class="filter-chip ${filter===c.id?'active':''}" onclick="setState({pontosFilter:'${c.id}'})">${c.label} (${n})</span>`;
        }).join("")}
      </div>
    </div>
    ${!pts.length ? `
      <div class="empty-state">
        <div class="empty-icon">📍</div>
        <div class="empty-title">Nenhum ponto ainda</div>
        <div class="empty-sub">Adicione hospedagens, restaurantes, atrações e muito mais</div>
        <button class="btn-drive" style="margin-top:16px" onclick="openAddPin()">＋ Adicionar ponto</button>
      </div>` : pts.map(p => renderPointCard(p)).join("")}
  `;
}

function renderPointCard(pin) {
  const cat  = catInfo(pin.category);
  const done = (state.pinsDone||{})[pin.id];
  const exp  = state.expandedPin === pin.id;
  const linkedDay = pin.dayId ? state.days.find(d => d.id == pin.dayId) : null;

  return `
    <div class="point-card ${done?'done':''}">
      <div class="point-header" onclick="setState({expandedPin:'${pin.id}'===String(state.expandedPin)?null:'${pin.id}'})">
        <button class="point-check ${done?'checked':''}" onclick="event.stopPropagation();togglePinDone('${pin.id}')">✓</button>
        <span class="point-cat-badge ${cat.cls}">${cat.label}</span>
        <span class="point-name">${pin.label}</span>
        <span style="color:var(--text3);font-size:11px">${exp?'▲':'▼'}</span>
      </div>
      ${exp ? `
        <div class="point-body">
          ${pin.lat && pin.lng ? `
            <div class="point-field full">
              <div class="point-field-label">Coordenadas</div>
              <div class="point-coords" onclick="copyCoords(${pin.lat},${pin.lng})">
                📌 ${parseFloat(pin.lat).toFixed(5)}, ${parseFloat(pin.lng).toFixed(5)}
                <span style="color:var(--text3);font-size:10px"> · copiar</span>
              </div>
            </div>` : ""}
          ${pin.price    ? `<div class="point-field"><div class="point-field-label">Preço</div><div class="point-field-value">💰 ${pin.price}</div></div>` : ""}
          ${pin.duration ? `<div class="point-field"><div class="point-field-label">Duração</div><div class="point-field-value">⏱ ${pin.duration}</div></div>` : ""}
          ${pin.hours    ? `<div class="point-field"><div class="point-field-label">Horário</div><div class="point-field-value">🕐 ${pin.hours}</div></div>` : ""}
          ${linkedDay    ? `<div class="point-field full"><div class="point-field-label">Dia vinculado</div><div class="point-field-value">📅 ${linkedDay.date} — ${linkedDay.title}</div></div>` : ""}
          ${pin.link     ? `<div class="point-field full"><div class="point-field-label">Reserva</div><a class="point-link" href="${pin.link}" target="_blank">🔗 ${pin.link}</a></div>` : ""}
          ${pin.note     ? `<div class="point-field full"><div class="point-field-label">Notas</div><div class="point-field-value" style="color:var(--text2)">${pin.note}</div></div>` : ""}
        </div>
        <div class="point-actions">
          <button class="point-btn" onclick="zoomToPin(${pin.lat},${pin.lng})">🗺️ Ver no mapa</button>
          <button class="point-btn" onclick="setState({editingPin:${JSON.stringify(pin).replace(/"/g,'&quot;')}})">✏️ Editar</button>
          <button class="point-btn danger" onclick="deletePin('${pin.id}')">🗑️</button>
        </div>` : ""}
    </div>`;
}

// ─── MEDIA ───────────────────────────────────────────────────────────────────
function renderMediaSection(day) {
  const mediaList = state.media[day.id] || [];
  const diary     = state.diaries[day.id] || "";
  const uploading = state.uploading[day.id];
  return `
    <div class="media-section">
      <div class="section-divider"><div></div><span>Fotos e Vídeos</span><div></div></div>
      ${mediaList.length ? `<div class="media-grid">${mediaList.map(m=>`
        <div class="media-thumb" onclick="openLightbox('${m.url}','${m.mimeType}')">
          ${m.mimeType.startsWith("video")
            ? `<video src="${m.url}" preload="none"></video><div class="play-icon">▶️</div>`
            : `<img src="${m.thumb||m.url}" loading="lazy"/>`}
        </div>`).join("")}</div>` : ""}
      <label class="upload-btn">
        ${uploading?"⏳ Enviando...":"📷 Adicionar foto ou vídeo"}
        <input type="file" accept="image/*,video/*" multiple style="display:none"
               onchange="handleUpload(event,${day.id})" ${uploading?"disabled":""} />
      </label>
      <div class="section-divider" style="margin-top:14px"><div></div><span>Diário</span><div></div></div>
      <textarea class="diary-textarea" id="diary-${day.id}" placeholder="Como foi o dia?">${diary}</textarea>
      <button class="btn-save" onclick="saveDiary(${day.id})">💾 Salvar diário</button>
    </div>`;
}

// ─── RESERVAS ────────────────────────────────────────────────────────────────
function renderReservasView() {
  if (!RESERVAS.length) return `
    <div class="empty-state" style="margin-top:60px">
      <div class="empty-icon">✅</div>
      <div class="empty-title">Nenhuma reserva cadastrada</div>
      <div class="empty-sub">As reservas aparecerão aqui quando você editar o arquivo <code>js/data.js</code></div>
    </div>`;

  const done = Object.values(state.reservas).filter(Boolean).length;
  const pct  = Math.round(done / RESERVAS.length * 100);
  const groups = ["🔴 Urgente","🟡 Antes de nov","🟢 Até out"];
  return `
    <div class="card mb-16">
      <h2 class="card-title">✅ Checklist de Reservas</h2>
      <p class="card-sub">${done}/${RESERVAS.length} confirmadas</p>
      <div class="progress-bar-lg mt-8"><div class="progress-fill-lg" style="width:${pct}%"></div></div>
    </div>
    ${groups.map(g => {
      const items = RESERVAS.filter(r => r.urgency === g);
      if (!items.length) return "";
      return `<div class="reserva-group">
        <div class="reserva-group-label">${g}</div>
        ${items.map(r=>`
          <div class="reserva-item ${state.reservas[r.id]?'done':''}" onclick="toggleReserva('${r.id}')">
            <div class="reserva-check ${state.reservas[r.id]?'checked':''}">✓</div>
            <div class="reserva-text">${r.text}</div>
          </div>`).join("")}
      </div>`;
    }).join("")}`;
}

// ─── USUARIOS ────────────────────────────────────────────────────────────────
function renderUsuariosView() {
  return `
    <div class="card mb-16">
      <h2 class="card-title">👥 Compartilhar acesso</h2>
      <p class="card-sub">Adicione o email da sua companheira como usuária de teste.</p>
    </div>
    <div class="card mb-16">
      <h3 class="card-title small">Como adicionar</h3>
      <div class="steps">
        <div class="step"><span class="step-n">1</span>Acesse <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank">console.cloud.google.com</a></div>
        <div class="step"><span class="step-n">2</span>Vá em <b>OAuth consent screen → Test users</b></div>
        <div class="step"><span class="step-n">3</span>Clique <b>"+ Add Users"</b> e adicione o email</div>
        <div class="step"><span class="step-n">4</span>Ela abre o app e clica em "Google Drive"</div>
      </div>
    </div>
    <div class="card">
      <h3 class="card-title small">Link do app</h3>
      <div class="share-link">https://hanteroi.github.io/patagonia-app/</div>
      <button class="btn-save mt-8" onclick="navigator.clipboard.writeText('https://hanteroi.github.io/patagonia-app/').then(()=>alert('Copiado!'))">📋 Copiar link</button>
    </div>`;
}

// ─── ADD PIN MODAL (3 modos) ──────────────────────────────────────────────────
function renderAddPinModal() {
  const mode = state.addPinMode || "map";
  const { lat, lng } = state.addingPin || { lat: -50, lng: -72 };

  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({addingPin:null,addPinMode:null})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">📍 Novo ponto</div>
          <button class="modal-close" onclick="setState({addingPin:null,addPinMode:null})">✕</button>
        </div>

        <label class="field-label">Nome *</label>
        <input id="pin-label" class="field-input" placeholder="ex: Hotel Los Andes, Mirante Fitz Roy..." />

        <label class="field-label">Categoria *</label>
        <select id="pin-cat" class="field-input">
          ${PIN_CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join("")}
        </select>

        <label class="field-label">Vincular a um dia (opcional)</label>
        <select id="pin-day" class="field-input">
          <option value="">— Ponto independente —</option>
          ${state.days.map(d=>`<option value="${d.id}">${d.date} · ${d.title}</option>`).join("")}
        </select>

        <div class="modal-section">📍 Localização</div>
        <div style="display:flex;gap:6px;margin-bottom:12px">
          <button class="btn-icon ${mode==='map'?'active-mode':''}"    onclick="setState({addPinMode:'map'})">🗺️ Do mapa</button>
          <button class="btn-icon ${mode==='search'?'active-mode':''}" onclick="setState({addPinMode:'search'})">🔍 Buscar</button>
          <button class="btn-icon ${mode==='manual'?'active-mode':''}" onclick="setState({addPinMode:'manual'})">✏️ Manual</button>
        </div>

        ${mode === 'map' ? `
          <div class="modal-coords">📌 ${lat.toFixed?.(5)||lat}, ${lng.toFixed?.(5)||lng}
            ${lat === -50 ? ' — <span style="color:var(--amber)">clique no mapa para escolher</span>' : ' ✓'}
          </div>
          <input type="hidden" id="pin-lat" value="${lat}" />
          <input type="hidden" id="pin-lng" value="${lng}" />
        ` : mode === 'search' ? `
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <input id="pin-search-query" class="field-input" style="margin:0;flex:1" placeholder="ex: Torres del Paine, Ushuaia..." />
            <button class="btn-drive" onclick="geocodeSearch()">Buscar</button>
          </div>
          <div id="geocode-results" style="margin-bottom:12px"></div>
          <input type="hidden" id="pin-lat" value="" />
          <input type="hidden" id="pin-lng" value="" />
        ` : `
          <div class="modal-grid">
            <div>
              <label class="field-label">Latitude</label>
              <input id="pin-lat" class="field-input" placeholder="-50.33750" />
            </div>
            <div>
              <label class="field-label">Longitude</label>
              <input id="pin-lng" class="field-input" placeholder="-72.26480" />
            </div>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:12px">
            💡 Google Maps → clique direito no local → copie as coordenadas
          </div>
        `}

        <div class="modal-section">Detalhes</div>
        <div class="modal-grid">
          <div><label class="field-label">Preço estimado</label><input id="pin-price" class="field-input" placeholder="ex: USD 25/pessoa" /></div>
          <div><label class="field-label">Duração</label><input id="pin-duration" class="field-input" placeholder="ex: 3 horas" /></div>
          <div><label class="field-label">Horário</label><input id="pin-hours" class="field-input" placeholder="ex: 9h–18h" /></div>
          <div><label class="field-label">Link de reserva</label><input id="pin-link" class="field-input" placeholder="https://..." /></div>
        </div>
        <label class="field-label">Notas</label>
        <textarea id="pin-note" class="field-input" rows="2" placeholder="Dicas, observações..."></textarea>

        <div class="modal-actions">
          <button class="btn-primary" onclick="savePin()">📍 Salvar ponto</button>
          <button class="btn-cancel"  onclick="setState({addingPin:null,addPinMode:null})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

// ─── EDIT PIN MODAL ──────────────────────────────────────────────────────────
function renderEditPinModal() {
  const pin = state.editingPin;
  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({editingPin:null})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">✏️ Editar ponto</div>
          <button class="modal-close" onclick="setState({editingPin:null})">✕</button>
        </div>
        <label class="field-label">Nome *</label>
        <input id="epin-label" class="field-input" value="${pin.label}" />
        <label class="field-label">Categoria *</label>
        <select id="epin-cat" class="field-input">
          ${PIN_CATEGORIES.map(c=>`<option value="${c.id}" ${c.id===pin.category?"selected":""}>${c.label}</option>`).join("")}
        </select>
        <label class="field-label">Vincular a um dia</label>
        <select id="epin-day" class="field-input">
          <option value="">— Ponto independente —</option>
          ${state.days.map(d=>`<option value="${d.id}" ${d.id==pin.dayId?"selected":""}>${d.date} · ${d.title}</option>`).join("")}
        </select>
        <div class="modal-section">Localização</div>
        <div class="modal-grid">
          <div><label class="field-label">Latitude</label><input id="epin-lat" class="field-input" value="${pin.lat||''}" /></div>
          <div><label class="field-label">Longitude</label><input id="epin-lng" class="field-input" value="${pin.lng||''}" /></div>
        </div>
        <div class="modal-section">Detalhes</div>
        <div class="modal-grid">
          <div><label class="field-label">Preço</label><input id="epin-price" class="field-input" value="${pin.price||''}" /></div>
          <div><label class="field-label">Duração</label><input id="epin-duration" class="field-input" value="${pin.duration||''}" /></div>
          <div><label class="field-label">Horário</label><input id="epin-hours" class="field-input" value="${pin.hours||''}" /></div>
          <div><label class="field-label">Link</label><input id="epin-link" class="field-input" value="${pin.link||''}" /></div>
        </div>
        <label class="field-label">Notas</label>
        <textarea id="epin-note" class="field-input" rows="2">${pin.note||""}</textarea>
        <div class="modal-actions">
          <button class="btn-primary" onclick="updatePin('${pin.id}')">💾 Salvar</button>
          <button class="btn-danger"  onclick="deletePin('${pin.id}')">🗑️</button>
          <button class="btn-cancel"  onclick="setState({editingPin:null})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

// ─── EDIT / ADD DAY MODALS ───────────────────────────────────────────────────
function renderEditModal() {
  const day = JSON.parse(state.editing);
  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({editing:null})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">✏️ Editar dia</div>
          <button class="modal-close" onclick="setState({editing:null})">✕</button>
        </div>
        ${renderDayForm("edit", day)}
        <div class="modal-actions">
          <button class="btn-primary" onclick="saveEdit()">💾 Salvar</button>
          <button class="btn-danger"  onclick="deleteDay(${day.id})">🗑️ Deletar</button>
          <button class="btn-cancel"  onclick="setState({editing:null})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

function renderAddModal() {
  const blank = { id: Date.now(), date:"", emoji:"📍", title:"", region: Object.keys(REGION_COLORS)[0]||"", drive:"", stays:"", lat:-50, lng:-72, highlights:[""], tip:"", paleo:"", alert:"" };
  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({adding:false})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">➕ Novo dia</div>
          <button class="modal-close" onclick="setState({adding:false})">✕</button>
        </div>
        ${renderDayForm("new", blank)}
        <div class="modal-actions">
          <button class="btn-primary" onclick="saveAdd()">➕ Adicionar</button>
          <button class="btn-cancel"  onclick="setState({adding:false})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

function renderDayForm(p, day) {
  const regionOpts = Object.keys(REGION_COLORS).map(r =>
    `<option value="${r}" ${day.region===r?"selected":""}>${r}</option>`).join("");
  return `
    <label class="field-label">Data</label>
    <input id="${p}-date"  class="field-input" value="${day.date||''}"  placeholder="ex: 16/12" />
    <label class="field-label">Emoji</label>
    <input id="${p}-emoji" class="field-input" value="${day.emoji||'📍'}" placeholder="🚗" />
    <label class="field-label">Título *</label>
    <input id="${p}-title" class="field-input" value="${(day.title||'').replace(/"/g,'&quot;')}" placeholder="ex: Bariloche → El Chaltén" />
    <label class="field-label">Região</label>
    <select id="${p}-region" class="field-input">${regionOpts}</select>
    <label class="field-label">Deslocamento</label>
    <input id="${p}-drive" class="field-input" value="${day.drive||''}" placeholder="ex: ~300 km" />
    <label class="field-label">Pernoite</label>
    <input id="${p}-stays" class="field-input" value="${(day.stays||'').replace(/"/g,'&quot;')}" placeholder="ex: Hotel Las Torres" />
    <div class="modal-section">Coordenadas (para o mapa)</div>
    <div class="modal-grid">
      <div><label class="field-label">Latitude</label><input id="${p}-lat" class="field-input" value="${day.lat||''}" placeholder="-50.33750" /></div>
      <div><label class="field-label">Longitude</label><input id="${p}-lng" class="field-input" value="${day.lng||''}" placeholder="-72.26480" /></div>
    </div>
    <label class="field-label" style="margin-bottom:4px">Destaques do dia</label>
    <div id="${p}-highlights">
      ${(day.highlights||['']).map((h,i)=>`
        <div class="hl-row">
          <input class="hl-input" value="${h.replace(/"/g,'&quot;')}" data-hl="${i}" placeholder="Destaque ${i+1}" />
          <button class="hl-remove" onclick="removeHL(this)">×</button>
        </div>`).join("")}
    </div>
    <button class="add-hl-btn" onclick="addHL('${p}')">+ Adicionar destaque</button>
    <label class="field-label" style="margin-top:10px">Dica</label>
    <textarea id="${p}-tip"   class="field-textarea" rows="2">${day.tip||''}</textarea>
    <label class="field-label">Alerta</label>
    <textarea id="${p}-alert" class="field-textarea" rows="2">${day.alert||''}</textarea>
    <input type="hidden" id="${p}-id"    value="${day.id}" />
    <input type="hidden" id="${p}-paleo" value="${day.paleo||''}" />`;
}

function renderLightbox() {
  const { url, type } = state.lightbox;
  return `
    <div class="lightbox" onclick="setState({lightbox:null})">
      <button class="lightbox-close" onclick="setState({lightbox:null})">✕</button>
      ${type&&type.startsWith("video")
        ? `<video src="${url}" controls autoplay style="max-width:95vw;max-height:85vh;border-radius:8px"></video>`
        : `<img src="${url}" style="max-width:95vw;max-height:85vh;border-radius:8px;object-fit:contain"/>`}
    </div>`;
}
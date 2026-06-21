// ─── js/ui.js ────────────────────────────────────────────────────────────────

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
        <div>
          <div class="eyebrow">Roteiro Compartilhado</div>
          <h1 class="app-title">🌎 Patagônia <span class="subtitle">16/12 – 12/01</span></h1>
        </div>
        <div class="topbar-right">
          ${state.token
            ? `<div class="progress-label">${done}/${state.days.length} dias · ${resDone}/${RESERVAS.length} reservas</div>
               <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`
            : `<button class="btn-drive" onclick="signIn()">🔗 Google Drive</button>`}
        </div>
      </div>
      <div class="nav-tabs">
        <button class="nav-tab ${state.view === "map"      ? "active" : ""}" onclick="setState({view:'map'})">🗺️ Mapa</button>
        <button class="nav-tab ${state.view === "list"     ? "active" : ""}" onclick="setState({view:'list'})">📅 Roteiro</button>
        <button class="nav-tab ${state.view === "reservas" ? "active" : ""}" onclick="setState({view:'reservas'})">✅ Reservas</button>
        <button class="nav-tab ${state.view === "paleo"    ? "active" : ""}" onclick="setState({view:'paleo'})">🦕 Paleo</button>
        ${state.token ? `<button class="nav-tab ${state.view === "usuarios" ? "active" : ""} ml-auto" onclick="setState({view:'usuarios'})">👥</button>` : ""}
        <button class="nav-tab ${state.token ? "" : "ml-auto"}" onclick="setState({adding:true})">＋</button>
      </div>
    </div>

    <div class="content" id="main-content">
      ${state.view === "map"      ? renderMapView()      : ""}
      ${state.view === "list"     ? renderListView()     : ""}
      ${state.view === "reservas" ? renderReservasView() : ""}
      ${state.view === "paleo"    ? renderPaleoView()    : ""}
      ${state.view === "usuarios" ? renderUsuariosView() : ""}
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
  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-header-title">🌎 Patagônia · 16/12 – 12/01</div>
        <div class="sidebar-subtitle">${state.days.length} dias · ${Object.values(state.checked).filter(Boolean).length} concluídos</div>
        <input
          class="sidebar-search"
          placeholder="🔍 Buscar dia ou local..."
          oninput="filterSidebar(this.value)"
          id="sidebar-search"
        />
      </div>
      <div class="sidebar-list" id="sidebar-list">
        ${renderSidebarItems(state.days)}
      </div>
    </div>

    <div class="map-panel">
      <div id="map"></div>
      ${sel ? `
        <div class="detail-drawer" id="detail-drawer">
          <div class="drawer-handle"></div>
          <button class="drawer-close" onclick="setState({selectedId:null})">✕</button>
          <button class="drawer-edit-btn" onclick="openEdit(${sel.id})">✏️ Editar</button>
          <div class="detail-region">${sel.region}</div>
          <div class="detail-title">${sel.emoji} ${sel.title}</div>
          <div class="detail-meta">📍 ${sel.stays} &nbsp;·&nbsp; 🚗 ${sel.drive}</div>
          <div class="highlights">
            ${sel.highlights.map(h => `
              <div class="highlight-item">
                <span class="hl-arrow" style="color:${REGION_COLORS[sel.region]||"#4ECDC4"}">→</span>${h}
              </div>`).join("")}
          </div>
          ${sel.tip   ? `<div class="box-tip">💡 ${sel.tip}</div>`   : ""}
          ${sel.paleo ? `<div class="box-paleo">${sel.paleo}</div>` : ""}
          ${sel.alert ? `<div class="box-alert">${sel.alert}</div>` : ""}
          ${state.token ? renderMediaSection(sel) : `
            <div class="drive-cta">
              <p>🔗 Conecte o Google Drive para adicionar fotos e escrever o diário</p>
              <button class="btn-drive" onclick="signIn()">Conectar Drive</button>
            </div>`}
        </div>` : `
        <div class="map-hint-float">
          💡 Clique em um marcador para ver detalhes · Clique no mapa para adicionar ponto
        </div>`}
    </div>
  `;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function renderSidebarItems(days) {
  const regions = [...new Set(days.map(d => d.region))];
  return regions.map(region => {
    const color = REGION_COLORS[region] || "#555";
    return `
      <div class="region-group">
        <div class="region-divider">
          <div class="region-line" style="background:${color}"></div>
          <span class="region-label" style="color:${color}">${region}</span>
          <div class="region-line" style="background:${color}"></div>
        </div>
        ${days.filter(d => d.region === region).map(d => renderDayRow(d, false)).join("")}
      </div>
    `;
  }).join("");
}

// ─── LIST VIEW ───────────────────────────────────────────────────────────────
function renderListView() {
  const regions = [...new Set(state.days.map(d => d.region))];
  return `<div class="day-list">` + regions.map(region => {
    const color = REGION_COLORS[region] || "#555";
    return `
      <div class="region-group">
        <div class="region-divider">
          <div class="region-line" style="background:${color}"></div>
          <span class="region-label" style="color:${color}">${region}</span>
          <div class="region-line" style="background:${color}"></div>
        </div>
        ${state.days.filter(d => d.region === region).map(d => renderDayRow(d, true)).join("")}
      </div>
    `;
  }).join("") + `</div>`;
}

// ─── DAY ROW ─────────────────────────────────────────────────────────────────
function renderDayRow(day, expandable) {
  const color    = REGION_COLORS[day.region] || "#555";
  const isSel    = day.id === state.selectedId;
  const isDone   = state.checked[day.id];
  const showDetail = expandable && isSel;

  // Na sidebar (não expandable): item enxuto com click que seleciona + zoom
  if (!expandable) {
    return `
      <div class="day-card sidebar-row ${isDone ? "done" : ""} ${isSel ? "selected" : ""}"
           onclick="selectDay(${day.id})">
        <div class="day-header">
          <button class="day-check ${isDone ? "checked" : ""}"
                  onclick="event.stopPropagation();toggleCheck(${day.id})">✓</button>
          <div class="day-bar" style="background:${color}"></div>
          <span class="day-emoji">${day.emoji}</span>
          <div class="day-info">
            <div class="day-meta">
              <span class="day-date">${day.date}</span>
              <span class="day-drive">${day.drive}</span>
            </div>
            <div class="day-title">${day.title}</div>
            <div class="day-stays">📍 ${day.stays}</div>
          </div>
          <button class="day-edit-btn"
                  onclick="event.stopPropagation();openEdit(${day.id})">✏️</button>
        </div>
      </div>
    `;
  }

  // Na aba Roteiro (expandable): card com detalhe inline
  return `
    <div class="day-card ${isDone ? "done" : ""} ${isSel ? "selected" : ""}"
         onclick="toggleSelect(${day.id})">
      <div class="day-header">
        <button class="day-check ${isDone ? "checked" : ""}"
                onclick="event.stopPropagation();toggleCheck(${day.id})">✓</button>
        <div class="day-bar" style="background:${color}"></div>
        <span class="day-emoji">${day.emoji}</span>
        <div class="day-info">
          <div class="day-meta">
            <span class="day-date">${day.date}</span>
            <span class="day-drive">${day.drive}</span>
          </div>
          <div class="day-title">${day.title}</div>
          <div class="day-stays">📍 ${day.stays}</div>
        </div>
        <button class="day-edit-btn"
                onclick="event.stopPropagation();openEdit(${day.id})">✏️</button>
      </div>
      ${showDetail ? renderDetailPanel(day) : ""}
    </div>
  `;
}

// ─── DETAIL PANEL (aba Roteiro) ───────────────────────────────────────────────
function renderDetailPanel(day) {
  const color     = REGION_COLORS[day.region] || "#555";
  const mediaList = state.media[day.id] || [];
  const diary     = state.diaries[day.id] || "";
  const uploading = state.uploading[day.id];

  return `
    <div class="detail-panel" style="border-left:4px solid ${color}">
      <div class="detail-header">
        <div>
          <div class="detail-region">${day.region}</div>
          <div class="detail-title">${day.emoji} ${day.title}</div>
          <div class="detail-meta">📍 ${day.stays} · 🚗 ${day.drive}</div>
        </div>
        <button onclick="openEdit(${day.id})" class="btn-edit-sm">✏️ Editar</button>
      </div>
      <div class="highlights">
        ${day.highlights.map(h => `
          <div class="highlight-item">
            <span class="hl-arrow" style="color:${color}">→</span>${h}
          </div>`).join("")}
      </div>
      ${day.tip   ? `<div class="box-tip">💡 ${day.tip}</div>`   : ""}
      ${day.paleo ? `<div class="box-paleo">${day.paleo}</div>` : ""}
      ${day.alert ? `<div class="box-alert">${day.alert}</div>` : ""}
      ${state.token ? renderMediaSection(day) : `
        <div class="drive-cta">
          <p>🔗 Conecte o Google Drive para adicionar fotos e escrever o diário</p>
          <button class="btn-drive" onclick="signIn()">Conectar Drive</button>
        </div>`}
    </div>
  `;
}

// ─── MEDIA SECTION ───────────────────────────────────────────────────────────
function renderMediaSection(day) {
  const mediaList = state.media[day.id] || [];
  const diary     = state.diaries[day.id] || "";
  const uploading = state.uploading[day.id];
  return `
    <div class="media-section">
      <div class="section-divider"><div></div><span>Fotos e Vídeos</span><div></div></div>
      ${mediaList.length ? `
        <div class="media-grid">
          ${mediaList.map(m => `
            <div class="media-thumb" onclick="openLightbox('${m.url}','${m.mimeType}')">
              ${m.mimeType.startsWith("video")
                ? `<video src="${m.url}" preload="none"></video><div class="play-icon">▶️</div>`
                : `<img src="${m.thumb || m.url}" loading="lazy"/>`}
            </div>`).join("")}
        </div>` : ""}
      <label class="upload-btn">
        ${uploading ? "⏳ Enviando..." : "📷 Adicionar foto ou vídeo"}
        <input type="file" accept="image/*,video/*" multiple style="display:none"
               onchange="handleUpload(event,${day.id})" ${uploading ? "disabled" : ""} />
      </label>
      <div class="section-divider" style="margin-top:14px"><div></div><span>Diário do dia</span><div></div></div>
      <textarea class="diary-textarea" id="diary-${day.id}"
                placeholder="Como foi o dia? O que vocês sentiram, viram, descobriram...">${diary}</textarea>
      <button class="btn-save" onclick="saveDiary(${day.id})">💾 Salvar diário</button>
    </div>
  `;
}

// ─── RESERVAS VIEW ────────────────────────────────────────────────────────────
function renderReservasView() {
  const done = Object.values(state.reservas).filter(Boolean).length;
  const pct  = Math.round(done / RESERVAS.length * 100);
  const groups = ["🔴 Urgente", "🟡 Antes de nov", "🟢 Até out"];

  return `
    <div class="card mb-16">
      <h2 class="card-title">✅ Checklist de Reservas</h2>
      <p class="card-sub">${done}/${RESERVAS.length} reservas confirmadas</p>
      <div class="progress-bar mt-8">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
    ${groups.map(g => {
      const items = RESERVAS.filter(r => r.urgency === g);
      if (!items.length) return "";
      return `
        <div class="reserva-group">
          <div class="reserva-group-label">${g}</div>
          ${items.map(r => `
            <div class="reserva-item ${state.reservas[r.id] ? "done" : ""}"
                 onclick="toggleReserva('${r.id}')">
              <div class="reserva-check ${state.reservas[r.id] ? "checked" : ""}">✓</div>
              <div class="reserva-text">${r.text}</div>
            </div>`).join("")}
        </div>`;
    }).join("")}
  `;
}

// ─── PALEO VIEW ───────────────────────────────────────────────────────────────
function renderPaleoView() {
  return `
    <div class="card mb-16">
      <h2 class="card-title">🦕 Paleontologia & Natureza Primitiva</h2>
      <p class="card-sub">Destaques científicos ao longo da rota — da megafauna pleistocênica aos estromatólitos vivos.</p>
    </div>
    ${state.days.filter(d => d.paleo).map(day => `
      <div class="paleo-card" style="border-left:4px solid ${REGION_COLORS[day.region] || "#555"}">
        <div class="paleo-header">
          <span class="paleo-emoji">${day.emoji}</span>
          <div>
            <div class="paleo-meta">${day.date} · ${day.region}</div>
            <div class="paleo-title">${day.title}</div>
          </div>
        </div>
        <div class="box-paleo">${day.paleo}</div>
      </div>`).join("")}
    <div class="card mt-8">
      <h3 class="card-title small">📚 Leituras para levar</h3>
      ${[
        ["The Voyage of the Beagle", "Charles Darwin", "O mesmo canal que vocês vão navegar"],
        ["In Patagonia", "Bruce Chatwin", "Clássico literário da Patagônia"],
        ["A Origem das Espécies", "Charles Darwin", "Inspirada pela viagem ao Canal Beagle"],
      ].map(([t, a, n]) => `
        <div class="book-item">
          <div class="book-title">${t}</div>
          <div class="book-author">${a}</div>
          <div class="book-note">${n}</div>
        </div>`).join("")}
    </div>
  `;
}

// ─── USUARIOS VIEW ────────────────────────────────────────────────────────────
function renderUsuariosView() {
  return `
    <div class="card mb-16">
      <h2 class="card-title">👥 Usuários do App</h2>
      <p class="card-sub">Para sua companheira conseguir logar, adicione o email dela como usuária de teste no Google Cloud Console.</p>
    </div>
    <div class="card mb-16">
      <h3 class="card-title small">Como adicionar sua companheira</h3>
      <div class="steps">
        <div class="step"><span class="step-n">1</span> Acesse <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" style="color:#4ECDC4">console.cloud.google.com</a></div>
        <div class="step"><span class="step-n">2</span> Vá em <b>OAuth consent screen → Test users</b></div>
        <div class="step"><span class="step-n">3</span> Clique <b>"+ Add Users"</b> e adicione o email dela</div>
        <div class="step"><span class="step-n">4</span> Ela abre o link do app e clica em "Google Drive"</div>
      </div>
    </div>
    <div class="card">
      <h3 class="card-title small">Link do app para compartilhar</h3>
      <div class="share-link">https://hanteroi.github.io/patagonia-app/</div>
      <button class="btn-save mt-8" onclick="navigator.clipboard.writeText('https://hanteroi.github.io/patagonia-app/').then(()=>alert('Link copiado!'))">
        📋 Copiar link
      </button>
    </div>
  `;
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function renderAddPinModal() {
  const { lat, lng } = state.addingPin;
  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({addingPin:null})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">📍 Novo ponto no mapa</div>
          <button class="modal-close" onclick="setState({addingPin:null})">✕</button>
        </div>
        <div class="modal-coords">📌 ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
        <label class="field-label">Nome do ponto</label>
        <input id="pin-label" class="field-input" placeholder="ex: Entrada Parque Torres del Paine" />
        <label class="field-label">Categoria</label>
        <select id="pin-cat" class="field-input" style="appearance:auto">
          ${PIN_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join("")}
        </select>
        <label class="field-label">Nota (opcional)</label>
        <input id="pin-note" class="field-input" placeholder="ex: Aberto das 8h às 18h, entrada $35 USD" />
        <div class="modal-actions">
          <button class="btn-primary" onclick="savePin()">📍 Salvar ponto</button>
          <button class="btn-cancel"  onclick="setState({addingPin:null})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

function renderEditPinModal() {
  const pin = state.editingPin;
  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({editingPin:null})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">✏️ Editar ponto</div>
          <button class="modal-close" onclick="setState({editingPin:null})">✕</button>
        </div>
        <label class="field-label">Nome</label>
        <input id="epin-label" class="field-input" value="${pin.label}" />
        <label class="field-label">Categoria</label>
        <select id="epin-cat" class="field-input" style="appearance:auto">
          ${PIN_CATEGORIES.map(c => `<option value="${c.id}" ${c.id === pin.category ? "selected" : ""}>${c.label}</option>`).join("")}
        </select>
        <label class="field-label">Nota</label>
        <input id="epin-note" class="field-input" value="${pin.note || ""}" />
        <div class="modal-actions">
          <button class="btn-primary" onclick="updatePin('${pin.id}')">💾 Salvar</button>
          <button class="btn-danger"  onclick="deletePin('${pin.id}')">🗑️</button>
          <button class="btn-cancel"  onclick="setState({editingPin:null})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

function renderEditModal() {
  const day = JSON.parse(state.editing);
  return `
    <div class="modal-overlay" onclick="if(event.target===this)setState({editing:null})">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">✏️ Editar — ${day.date}</div>
          <button class="modal-close" onclick="setState({editing:null})">✕</button>
        </div>
        ${renderDayForm("edit", day)}
        <div class="modal-actions">
          <button class="btn-primary" onclick="saveEdit()">💾 Salvar</button>
          <button class="btn-danger"  onclick="deleteDay(${day.id})">🗑️</button>
          <button class="btn-cancel"  onclick="setState({editing:null})">Cancelar</button>
        </div>
      </div>
    </div>`;
}

function renderAddModal() {
  const blank = {
    id: Math.max(0, ...state.days.map(d => d.id)) + 1,
    date: "", emoji: "📍", title: "", region: "Ruta 40",
    drive: "", stays: "", lat: -50, lng: -72,
    highlights: [""], tip: "", paleo: "", alert: "",
  };
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
  return `
    ${[["Data","date"],["Emoji","emoji"],["Título","title"],["Região","region"],["Deslocamento","drive"],["Pernoite","stays"]].map(([l, k]) => `
      <label class="field-label">${l}</label>
      <input id="${p}-${k}" class="field-input" value="${(day[k] || "").replace(/"/g, "&quot;")}" />`).join("")}
    <label class="field-label" style="margin-bottom:4px">Destaques</label>
    <div id="${p}-highlights">
      ${(day.highlights || [""]).map((h, i) => `
        <div class="hl-row">
          <input class="hl-input" value="${h.replace(/"/g, "&quot;")}" data-hl="${i}" />
          <button class="hl-remove" onclick="removeHL(this)">×</button>
        </div>`).join("")}
    </div>
    <button class="add-hl-btn" onclick="addHL('${p}')">+ Adicionar destaque</button>
    ${[["Dica","tip"],["Paleo/Natureza","paleo"],["Alerta","alert"]].map(([l, k]) => `
      <label class="field-label" style="margin-top:10px">${l}</label>
      <textarea id="${p}-${k}" class="field-textarea" rows="2">${day[k] || ""}</textarea>`).join("")}
    <input type="hidden" id="${p}-id"  value="${day.id}" />
    <input type="hidden" id="${p}-lat" value="${day.lat}" />
    <input type="hidden" id="${p}-lng" value="${day.lng}" />`;
}

function renderLightbox() {
  const { url, type } = state.lightbox;
  return `
    <div class="lightbox" onclick="setState({lightbox:null})">
      <button class="lightbox-close" onclick="setState({lightbox:null})">✕</button>
      ${type && type.startsWith("video")
        ? `<video src="${url}" controls autoplay style="max-width:95vw;max-height:85vh;border-radius:8px"></video>`
        : `<img src="${url}" style="max-width:95vw;max-height:85vh;border-radius:8px;object-fit:contain"/>`}
    </div>`;
}
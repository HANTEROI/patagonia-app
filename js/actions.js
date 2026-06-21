// ─── js/actions.js ───────────────────────────────────────────────────────────

// ─── DIAS ────────────────────────────────────────────────────────────────────
window.toggleSelect = id => {
  const newId = state.selectedId === id ? null : id;
  setState({ selectedId: newId, selectedPinId: null });
  if (newId && state.view === "map") flyToDay(newId);
};

window.selectDay = id => {
  const newId = state.selectedId === id ? null : id;
  setState({ selectedId: newId, selectedPinId: null });
  if (newId) flyToDay(newId);
  requestAnimationFrame(() => {
    const el = document.querySelector(".day-row.selected");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
};

window.toggleCheck = id => {
  setState({ checked: { ...state.checked, [id]: !state.checked[id] } });
  saveCloudData();
};

window.openEdit = id => setState({ editing: JSON.stringify(state.days.find(d => d.id === id)) });

window.saveEdit = () => {
  const u = readForm("edit");
  setState({ days: state.days.map(d => d.id === u.id ? u : d), editing: null });
  saveCloudData();
};

window.saveAdd = () => {
  const n = readForm("new");
  setState({ days: [...state.days, n], adding: false });
  saveCloudData();
};

window.deleteDay = id => {
  if (!confirm("Deletar este dia? Os pontos vinculados a ele ficarão soltos.")) return;
  const pins = state.pins.map(p => p.dayId == id ? { ...p, dayId: null } : p);
  setState({ days: state.days.filter(d => d.id !== id), editing: null, selectedId: state.selectedId === id ? null : state.selectedId, pins });
  saveCloudData();
};

function readForm(p) {
  const g = k => (document.getElementById(`${p}-${k}`)?.value || "").trim();
  return {
    id:         parseInt(g("id")) || Date.now(),
    date:       g("date"),
    emoji:      g("emoji") || "📍",
    title:      g("title"),
    region:     g("region"),
    drive:      g("drive"),
    stays:      g("stays"),
    lat:        parseFloat(g("lat")) || -50,
    lng:        parseFloat(g("lng")) || -72,
    highlights: Array.from(document.querySelectorAll(`#${p}-highlights .hl-input`))
                     .map(i => i.value.trim()).filter(Boolean),
    tip:   g("tip")   || null,
    paleo: g("paleo") || null,
    alert: g("alert") || null,
  };
}

window.addHL = p => {
  const c = document.getElementById(`${p}-highlights`);
  const i = c.querySelectorAll(".hl-row").length;
  const row = document.createElement("div");
  row.className = "hl-row";
  row.innerHTML = `<input class="hl-input" value="" data-hl="${i}" placeholder="Destaque ${i+1}"/><button class="hl-remove" onclick="removeHL(this)">×</button>`;
  c.appendChild(row);
};
window.removeHL = btn => btn.closest(".hl-row").remove();

// ─── SIDEBAR / FILTROS ───────────────────────────────────────────────────────
window.filterSidebar = query => {
  const q = query.toLowerCase();
  const filtered = q
    ? state.days.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.stays.toLowerCase().includes(q)  ||
        d.region.toLowerCase().includes(q) ||
        d.date.includes(q))
    : state.days;
  const list = document.getElementById("sidebar-list");
  if (list) list.innerHTML = renderSidebarItems(filtered);
};

window.setFilter = f => {
  activeFilter = f;
  const list = document.getElementById("sidebar-list");
  if (list) list.innerHTML = renderSidebarItems(state.days);
  document.querySelectorAll(".filter-chip").forEach(el => {
    const label = el.textContent.trim();
    el.classList.toggle("active",
      (f==="all" && label==="Todos") ||
      (f==="pendente" && label==="Pendentes") ||
      (f==="feito" && label==="Concluídos")
    );
  });
};

// ─── RESERVAS ────────────────────────────────────────────────────────────────
window.toggleReserva = id => {
  setState({ reservas: { ...state.reservas, [id]: !state.reservas[id] } });
  saveCloudData();
};

// ─── MEDIA / DIÁRIO ──────────────────────────────────────────────────────────
window.openLightbox = (url, type) => setState({ lightbox: { url, type } });
window.signIn = signIn;

window.saveDiary = id => {
  const el = document.getElementById(`diary-${id}`);
  if (!el) return;
  setState({ diaries: { ...state.diaries, [id]: el.value } });
  saveCloudData();
};

window.handleUpload = async (e, dayId) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  setState({ uploading: { ...state.uploading, [dayId]: true } });
  for (const f of files) await uploadFile(dayId, f).catch(err => alert("Erro: " + err.message));
  setState({ uploading: { ...state.uploading, [dayId]: false } });
};

// ─── PONTOS ──────────────────────────────────────────────────────────────────
window.openAddPin = () => {
  setState({ addingPin: { lat: -50, lng: -72 }, addPinMode: "manual" });
};

window.openAddPinForDay = dayId => {
  setState({ addingPin: { lat: -50, lng: -72 }, addPinMode: "manual", addPinDayId: dayId });
  // pré-seleciona o dia no modal após render
  requestAnimationFrame(() => {
    const sel = document.getElementById("pin-day");
    if (sel) sel.value = dayId;
  });
};

window.savePin = () => {
  const label = document.getElementById("pin-label")?.value.trim();
  if (!label) { alert("Digite um nome para o ponto."); return; }

  const latRaw = document.getElementById("pin-lat")?.value.trim();
  const lngRaw = document.getElementById("pin-lng")?.value.trim();
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (!latRaw || !lngRaw || isNaN(lat) || isNaN(lng)) {
    alert("Defina as coordenadas do ponto (busque, clique no mapa ou digite manualmente).");
    return;
  }

  const dayId = document.getElementById("pin-day")?.value || null;

  const pin = {
    id:       "p" + Date.now(),
    lat, lng, label,
    category: document.getElementById("pin-cat")?.value || "turistico",
    dayId:    dayId ? parseInt(dayId) : null,
    price:    document.getElementById("pin-price")?.value.trim()    || "",
    duration: document.getElementById("pin-duration")?.value.trim() || "",
    hours:    document.getElementById("pin-hours")?.value.trim()    || "",
    link:     document.getElementById("pin-link")?.value.trim()     || "",
    note:     document.getElementById("pin-note")?.value.trim()     || "",
  };

  setState({ pins: [...state.pins, pin], addingPin: null, addPinMode: null, addPinDayId: null });
  saveCloudData();
};

window.updatePin = id => {
  const dayVal = document.getElementById("epin-day")?.value;
  const pins = state.pins.map(p => p.id === id ? {
    ...p,
    label:    document.getElementById("epin-label")?.value.trim() || p.label,
    category: document.getElementById("epin-cat")?.value          || p.category,
    dayId:    dayVal ? parseInt(dayVal) : null,
    lat:      parseFloat(document.getElementById("epin-lat")?.value)      || p.lat,
    lng:      parseFloat(document.getElementById("epin-lng")?.value)      || p.lng,
    price:    document.getElementById("epin-price")?.value.trim()    || "",
    duration: document.getElementById("epin-duration")?.value.trim() || "",
    hours:    document.getElementById("epin-hours")?.value.trim()    || "",
    link:     document.getElementById("epin-link")?.value.trim()     || "",
    note:     document.getElementById("epin-note")?.value.trim()     || "",
  } : p);
  setState({ pins, editingPin: null });
  saveCloudData();
};

window.deletePin = id => {
  if (!confirm("Remover este ponto?")) return;
  setState({ pins: state.pins.filter(p => p.id !== id), editingPin: null, expandedPin: null, selectedPinId: null });
  saveCloudData();
};

window.togglePinDone = id => {
  const pinsDone = { ...(state.pinsDone||{}), [id]: !(state.pinsDone||{})[id] };
  setState({ pinsDone });
  saveCloudData();
};

window.zoomToPin = (lat, lng) => {
  if (!lat || !lng) return;
  setState({ view: "map", selectedId: null, selectedPinId: null });
  requestAnimationFrame(() => {
    initMap();
    updateMapMarkers();
    if (mapInst) mapInst.setView([lat, lng], 14, { animate: true });
  });
};

window.copyCoords = (lat, lng) => {
  const text = `${lat}, ${lng}`;
  navigator.clipboard.writeText(text).then(() => {
    const els = document.querySelectorAll(".point-coords");
    els.forEach(el => {
      if (el.textContent.includes(parseFloat(lat).toFixed(3))) {
        const orig = el.innerHTML;
        el.innerHTML = "✅ Copiado!";
        setTimeout(() => { el.innerHTML = orig; }, 1500);
      }
    });
  });
};

// ─── GEOCODING (busca de endereço) ───────────────────────────────────────────
window.geocodeSearch = async () => {
  const q = document.getElementById("pin-search-query")?.value.trim();
  if (!q) return;
  const resultsEl = document.getElementById("geocode-results");
  if (resultsEl) resultsEl.innerHTML = `<div style="font-size:12px;color:var(--text3)">Buscando...</div>`;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&accept-language=pt`;
    const res = await fetch(url, { headers: { "User-Agent": "patagonia-app" } });
    const data = await res.json();

    if (!data.length) {
      resultsEl.innerHTML = `<div style="font-size:12px;color:var(--red)">Nenhum resultado. Tente outro nome.</div>`;
      return;
    }

    resultsEl.innerHTML = data.map((r, i) => `
      <div onclick="selectGeoResult(${r.lat},${r.lon},'${r.display_name.replace(/'/g,"&#39;")}')"
           style="padding:7px 10px;border-radius:var(--radius);border:1px solid var(--border);
                  margin-bottom:4px;cursor:pointer;font-size:12px;background:var(--bg2);
                  transition:background .12s"
           onmouseover="this.style.background='var(--accent-l)'"
           onmouseout="this.style.background='var(--bg2)'">
        <div style="font-weight:600;color:var(--text1)">${r.display_name.split(",")[0]}</div>
        <div style="color:var(--text3);font-size:10px;margin-top:1px">${r.display_name}</div>
        <div style="color:var(--accent2);font-size:10px;font-family:monospace">${parseFloat(r.lat).toFixed(5)}, ${parseFloat(r.lon).toFixed(5)}</div>
      </div>`).join("");
  } catch(e) {
    resultsEl.innerHTML = `<div style="font-size:12px;color:var(--red)">Erro na busca. Verifique a conexão.</div>`;
  }
};

window.selectGeoResult = (lat, lng, name) => {
  document.getElementById("pin-lat").value = lat;
  document.getElementById("pin-lng").value = lng;
  if (!document.getElementById("pin-label").value) {
    document.getElementById("pin-label").value = name.split(",")[0];
  }
  const resultsEl = document.getElementById("geocode-results");
  if (resultsEl) resultsEl.innerHTML = `<div style="font-size:12px;color:var(--accent);padding:6px 10px;background:var(--accent-l);border-radius:var(--radius)">✓ ${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)} selecionado</div>`;
};

// ─── MAP CLICK → ADD PIN ──────────────────────────────────────────────────────
// Chamado pelo js/map.js quando clica no mapa
window.onMapClick = (lat, lng) => {
  if (state.addingPin && state.addPinMode === "map") {
    // atualiza coordenadas no modal aberto
    setState({ addingPin: { lat, lng } });
  } else {
    // abre modal no modo mapa
    setState({ addingPin: { lat, lng }, addPinMode: "map" });
  }
};
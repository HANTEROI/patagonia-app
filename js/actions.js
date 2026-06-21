// ─── js/actions.js ───────────────────────────────────────────────────────────

// ─── DIAS ────────────────────────────────────────────────────────────────────
window.toggleSelect = id => {
  const newId = state.selectedId === id ? null : id;
  setState({ selectedId: newId });
  if (newId && state.view === "map") flyToDay(newId);
};

window.selectDay = id => {
  const newId = state.selectedId === id ? null : id;
  setState({ selectedId: newId });
  if (newId) flyToDay(newId);
  requestAnimationFrame(() => {
    const el = document.querySelector(".day-row.selected");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
};

window.toggleCheck = id => {
  const checked = { ...state.checked, [id]: !state.checked[id] };
  setState({ checked });
  saveCloudData();
};

window.openEdit = id => setState({ editing: JSON.stringify(state.days.find(d => d.id === id)) });

window.saveEdit = () => {
  const u = readForm("edit");
  setState({ days: state.days.map(d => d.id === u.id ? u : d), editing: null });
};

window.saveAdd = () => {
  const n = readForm("new");
  setState({ days: [...state.days, n], adding: false });
};

window.deleteDay = id => {
  if (!confirm("Deletar este dia?")) return;
  setState({
    days: state.days.filter(d => d.id !== id),
    editing: null,
    selectedId: state.selectedId === id ? null : state.selectedId,
  });
};

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
window.filterSidebar = query => {
  const q = query.toLowerCase();
  const filtered = q
    ? state.days.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.stays.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.date.includes(q)
      )
    : state.days;
  const list = document.getElementById("sidebar-list");
  if (list) list.innerHTML = renderSidebarItems(filtered);
};

window.setFilter = f => {
  activeFilter = f;
  const list = document.getElementById("sidebar-list");
  if (list) list.innerHTML = renderSidebarItems(state.days);
  // atualizar chips
  document.querySelectorAll(".filter-chip").forEach(el => {
    el.classList.toggle("active", el.textContent.trim().startsWith(
      f === "all" ? "Todos" : f === "pendente" ? "Pendentes" : "Concluídos"
    ));
  });
};

// ─── RESERVAS ────────────────────────────────────────────────────────────────
window.toggleReserva = id => {
  const reservas = { ...state.reservas, [id]: !state.reservas[id] };
  setState({ reservas });
  saveCloudData();
};

// ─── MEDIA / DIÁRIO ──────────────────────────────────────────────────────────
window.openLightbox = (url, type) => setState({ lightbox: { url, type } });
window.signIn = signIn;

window.saveDiary = id => {
  const el = document.getElementById(`diary-${id}`);
  if (!el) return;
  const diaries = { ...state.diaries, [id]: el.value };
  setState({ diaries });
  saveCloudData();
};

window.handleUpload = async (e, dayId) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  setState({ uploading: { ...state.uploading, [dayId]: true } });
  for (const f of files) await uploadFile(dayId, f).catch(err => alert("Erro: " + err.message));
  setState({ uploading: { ...state.uploading, [dayId]: false } });
};

// ─── HIGHLIGHTS FORM ─────────────────────────────────────────────────────────
window.addHL = p => {
  const c = document.getElementById(`${p}-highlights`);
  const i = c.querySelectorAll(".hl-row").length;
  const row = document.createElement("div");
  row.className = "hl-row";
  row.innerHTML = `<input class="hl-input" value="" data-hl="${i}"/><button class="hl-remove" onclick="removeHL(this)">×</button>`;
  c.appendChild(row);
};
window.removeHL = btn => btn.closest(".hl-row").remove();

function readForm(p) {
  const g = k => (document.getElementById(`${p}-${k}`)?.value || "").trim();
  return {
    id:         parseInt(g("id")),
    date:       g("date"),
    emoji:      g("emoji"),
    title:      g("title"),
    region:     g("region"),
    drive:      g("drive"),
    stays:      g("stays"),
    lat:        parseFloat(g("lat")),
    lng:        parseFloat(g("lng")),
    highlights: Array.from(document.querySelectorAll(`#${p}-highlights .hl-input`))
                     .map(i => i.value.trim()).filter(Boolean),
    tip:   g("tip")   || null,
    paleo: g("paleo") || null,
    alert: g("alert") || null,
  };
}

// ─── PONTOS (PINS) ───────────────────────────────────────────────────────────
window.savePin = () => {
  const label = document.getElementById("pin-label")?.value.trim();
  if (!label) { alert("Digite um nome para o ponto."); return; }

  const manualLat = document.getElementById("pin-lat")?.value.trim();
  const manualLng = document.getElementById("pin-lng")?.value.trim();
  const lat = manualLat ? parseFloat(manualLat) : state.addingPin.lat;
  const lng = manualLng ? parseFloat(manualLng) : state.addingPin.lng;

  if (isNaN(lat) || isNaN(lng)) { alert("Coordenadas inválidas. Use o formato: -50.3375"); return; }

  const pin = {
    id:       "p" + Date.now(),
    lat, lng, label,
    category: document.getElementById("pin-cat")?.value || "turistico",
    price:    document.getElementById("pin-price")?.value.trim()    || "",
    duration: document.getElementById("pin-duration")?.value.trim() || "",
    hours:    document.getElementById("pin-hours")?.value.trim()    || "",
    link:     document.getElementById("pin-link")?.value.trim()     || "",
    note:     document.getElementById("pin-note")?.value.trim()     || "",
  };

  setState({ pins: [...state.pins, pin], addingPin: null, manualCoords: false });
  saveCloudData();
};

window.updatePin = id => {
  const pins = state.pins.map(p => p.id === id ? {
    ...p,
    label:    document.getElementById("epin-label")?.value.trim()    || p.label,
    category: document.getElementById("epin-cat")?.value             || p.category,
    lat:      parseFloat(document.getElementById("epin-lat")?.value) || p.lat,
    lng:      parseFloat(document.getElementById("epin-lng")?.value) || p.lng,
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
  setState({ pins: state.pins.filter(p => p.id !== id), editingPin: null, expandedPin: null });
  saveCloudData();
};

window.togglePinDone = id => {
  const pinsDone = { ...(state.pinsDone || {}), [id]: !(state.pinsDone || {})[id] };
  setState({ pinsDone });
  saveCloudData();
};

window.zoomToPin = (lat, lng) => {
  setState({ view: "map", selectedId: null });
  requestAnimationFrame(() => {
    initMap();
    updateMapMarkers();
    if (mapInst) mapInst.setView([lat, lng], 13, { animate: true });
  });
};

window.copyCoords = coords => {
  navigator.clipboard.writeText(coords).then(() => {
    const el = event.currentTarget;
    const orig = el.innerHTML;
    el.innerHTML = "✅ Copiado!";
    setTimeout(() => { el.innerHTML = orig; }, 1500);
  });
};
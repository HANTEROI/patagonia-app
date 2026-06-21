// ─── js/map.js ───────────────────────────────────────────────────────────────

let _map        = null;
let _dayMarkers = [];
let _pinMarkers = [];
let _poly       = null;
let _mapReady   = false;

function initMap() {
  const el = document.getElementById("map");
  if (!el || !window.L) return;

  if (_map) {
    setTimeout(() => { _map.invalidateSize(); updateMapMarkers(); }, 100);
    return;
  }

  _map = L.map(el, { zoomControl: true, scrollWheelZoom: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap", maxZoom: 18,
  }).addTo(_map);

  // Centro inicial na Patagônia
  _map.setView([-50, -71], 4);
  _mapReady = true;

  // Clique no mapa → delega ao actions.js
  _map.on("click", e => {
    if (window.onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
  });

  updateMapMarkers();
}

function updateMapMarkers() {
  if (!_map || !_mapReady) return;
  const L = window.L;

  _dayMarkers.forEach(m => m.remove()); _dayMarkers = [];
  _pinMarkers.forEach(m => m.remove()); _pinMarkers = [];
  if (_poly) { _poly.remove(); _poly = null; }

  // Linha da rota (só se houver dias)
  if (state.days.length > 1) {
    const latlngs = state.days.map(d => [d.lat, d.lng]);
    _poly = L.polyline(latlngs, {
      color: "#2B5F4E", weight: 2, opacity: 0.3, dashArray: "6,6"
    }).addTo(_map);
  }

  // Marcadores dos dias
  state.days.forEach(day => {
    const isSel  = day.id === state.selectedId;
    const isDone = state.checked[day.id];
    const color  = REGION_COLORS[day.region] || "#888";
    const sz     = isSel ? 38 : 30;

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:${isSel ? "var(--accent,#2B5F4E)" : color};
        border:${isSel ? "3px solid #fff" : "2px solid rgba(255,255,255,.5)"};
        display:flex;align-items:center;justify-content:center;
        font-size:${isSel ? 17 : 13}px;cursor:pointer;
        box-shadow:0 2px 10px rgba(0,0,0,.3);
        opacity:${isDone ? .5 : 1};
        transition:all .2s;
      ">${day.emoji||'📍'}</div>`,
      iconSize: [sz, sz], iconAnchor: [sz/2, sz/2],
    });

    const m = L.marker([day.lat, day.lng], { icon })
      .addTo(_map)
      .bindTooltip(`<b>${day.date}</b><br>${day.title}`, { direction:"top", offset:[0,-8] })
      .on("click", e => {
        L.DomEvent.stopPropagation(e);
        const newId = day.id === state.selectedId ? null : day.id;
        setState({ selectedId: newId, selectedPinId: null });
        if (newId) _map.setView([day.lat, day.lng], 9, { animate: true });
      });

    _dayMarkers.push(m);
  });

  // Marcadores dos pontos customizados
  (state.pins || []).forEach(pin => {
    if (!pin.lat || !pin.lng) return;
    const cat    = PIN_CATEGORIES.find(c => c.id === pin.category) || PIN_CATEGORIES[0];
    const isSel  = pin.id === state.selectedPinId;
    const isDone = (state.pinsDone||{})[pin.id];

    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:${isSel?34:26}px;height:${isSel?34:26}px;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${cat.color};
        border:${isSel ? "3px solid #fff" : "2px solid rgba(255,255,255,.6)"};
        box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer;
        opacity:${isDone ? .45 : 1};
        transition:all .2s;
      "><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;font-size:${isSel?15:12}px">
        ${cat.label.split(" ")[0]}
      </div></div>`,
      iconSize:   [isSel?34:26, isSel?34:26],
      iconAnchor: [isSel?17:13, isSel?34:26],
    });

    const tooltip = `<b>${pin.label}</b>${pin.price ? `<br>💰 ${pin.price}` : ""}${pin.hours ? `<br>🕐 ${pin.hours}` : ""}`;

    const m = L.marker([pin.lat, pin.lng], { icon })
      .addTo(_map)
      .bindTooltip(tooltip, { direction:"top", offset:[0, isSel?-34:-26] })
      .on("click", e => {
        L.DomEvent.stopPropagation(e);
        const newId = pin.id === state.selectedPinId ? null : pin.id;
        setState({ selectedPinId: newId, selectedId: null });
        if (newId) _map.setView([pin.lat, pin.lng], 13, { animate: true });
      });

    _pinMarkers.push(m);
  });
}

function flyToDay(dayId) {
  if (!_map) return;
  const day = state.days.find(d => d.id === dayId);
  if (day) _map.setView([day.lat, day.lng], 9, { animate: true });
}

// expõe globalmente
window.mapInst = _map;
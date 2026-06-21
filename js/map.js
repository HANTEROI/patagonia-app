// ─── js/map.js ───────────────────────────────────────────────────────────────

let _map = null;
let _dayMarkers = [];
let _pinMarkers = [];
let _poly = null;
let _mapReady = false;

function initMap() {
  const el = document.getElementById("map");
  if (!el || !window.L) return;

  // If map already exists, just invalidate size and update markers
  if (_map) {
    setTimeout(() => {
      _map.invalidateSize();
      updateMapMarkers();
    }, 100);
    return;
  }

  _map = L.map(el, { zoomControl: true, scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap", maxZoom: 18,
  }).addTo(_map);
  _map.setView([-50, -71], 4);
  _mapReady = true;

  // Click on map = add custom pin
  _map.on("click", e => {
    setState({ addingPin: { lat: e.latlng.lat, lng: e.latlng.lng } });
  });

  updateMapMarkers();
}

function updateMapMarkers() {
  if (!_map || !_mapReady) return;
  const L = window.L;

  // Clear existing
  _dayMarkers.forEach(m => m.remove()); _dayMarkers = [];
  _pinMarkers.forEach(m => m.remove()); _pinMarkers = [];
  if (_poly) { _poly.remove(); _poly = null; }

  // Route polyline
  const latlngs = state.days.map(d => [d.lat, d.lng]);
  _poly = L.polyline(latlngs, { color: "#4ECDC4", weight: 2, opacity: 0.4, dashArray: "6,6" }).addTo(_map);

  // Day markers
  state.days.forEach(day => {
    const isSel = day.id === state.selectedId;
    const color = REGION_COLORS[day.region] || "#555";
    const sz = isSel ? 36 : 28;
    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:${isSel ? "#4ECDC4" : color};
        border:${isSel ? "3px solid #fff" : "2px solid rgba(255,255,255,.4)"};
        display:flex;align-items:center;justify-content:center;
        font-size:${isSel ? 16 : 12}px;cursor:pointer;
        box-shadow:0 2px 10px rgba(0,0,0,.6);
        transition:all .2s;
      ">${day.emoji}</div>`,
      iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
    });
    const m = L.marker([day.lat, day.lng], { icon })
      .addTo(_map)
      .bindTooltip(`<b>${day.date}</b><br>${day.title}`, { direction: "top", offset: [0, -8] })
      .on("click", e => {
        L.DomEvent.stopPropagation(e);
        const newId = day.id === state.selectedId ? null : day.id;
        setState({ selectedId: newId });
        if (newId) _map.setView([day.lat, day.lng], 8, { animate: true });
      });
    _dayMarkers.push(m);
  });

  // Custom pins
  state.pins.forEach(pin => {
    const cat = PIN_CATEGORIES.find(c => c.id === pin.category) || PIN_CATEGORIES[5];
    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);background:${cat.color};
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;
      "><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;font-size:14px">
        ${cat.label.split(" ")[0]}
      </div></div>`,
      iconSize: [32, 32], iconAnchor: [16, 32],
    });
    const m = L.marker([pin.lat, pin.lng], { icon })
      .addTo(_map)
      .bindTooltip(`<b>${pin.label}</b>${pin.note ? `<br><i>${pin.note}</i>` : ""}`, { direction: "top", offset: [0, -32] })
      .on("click", e => {
        L.DomEvent.stopPropagation(e);
        setState({ editingPin: pin });
      });
    _pinMarkers.push(m);
  });
}

function flyToDay(dayId) {
  if (!_map) return;
  const day = state.days.find(d => d.id === dayId);
  if (day) _map.setView([day.lat, day.lng], 8, { animate: true });
}

// ─── js/actions.js ───────────────────────────────────────────────────────────

window.toggleSelect = id => {
  const newId = state.selectedId === id ? null : id;
  setState({ selectedId: newId });
  if (newId && state.view === "map") flyToDay(newId);
};

window.toggleCheck = id => {
  const checked = { ...state.checked, [id]: !state.checked[id] };
  setState({ checked });
  saveCloudData();
};

window.toggleReserva = id => {
  const reservas = { ...state.reservas, [id]: !state.reservas[id] };
  setState({ reservas });
  saveCloudData();
};

window.openLightbox = (url, type) => setState({ lightbox: { url, type } });
window.signIn = signIn;

window.openEdit = id => setState({ editing: JSON.stringify(state.days.find(d => d.id === id)) });

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

window.savePin = () => {
  const label = document.getElementById("pin-label")?.value.trim();
  if (!label) { alert("Digite um nome para o ponto."); return; }
  const pin = {
    id: "p" + Date.now(),
    lat: state.addingPin.lat,
    lng: state.addingPin.lng,
    label,
    category: document.getElementById("pin-cat")?.value || "info",
    note: document.getElementById("pin-note")?.value.trim() || "",
  };
  const pins = [...state.pins, pin];
  setState({ pins, addingPin: null });
  saveCloudData();
};

window.updatePin = id => {
  const pins = state.pins.map(p => p.id === id ? {
    ...p,
    label:    document.getElementById("epin-label")?.value.trim() || p.label,
    category: document.getElementById("epin-cat")?.value || p.category,
    note:     document.getElementById("epin-note")?.value.trim() || "",
  } : p);
  setState({ pins, editingPin: null });
  saveCloudData();
};

window.deletePin = id => {
  if (!confirm("Remover ponto?")) return;
  setState({ pins: state.pins.filter(p => p.id !== id), editingPin: null });
  saveCloudData();
};

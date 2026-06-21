// ─── js/data.js ──────────────────────────────────────────────────────────────

const PIN_CATEGORIES = [
  { id:"hospedagem",  label:"🛏️ Hospedagem",       cls:"cat-hospedagem",  color:"#1D4ED8" },
  { id:"turistico",   label:"🏛️ Ponto Turístico",   cls:"cat-turistico",   color:"#7E22CE" },
  { id:"passeio",     label:"🎯 Passeio",            cls:"cat-passeio",     color:"#15803D" },
  { id:"apoio",       label:"🏙️ Cidade de Apoio",    cls:"cat-apoio",       color:"#C2410C" },
  { id:"carro",       label:"🚗 Locação de Carro",   cls:"cat-carro",       color:"#0369A1" },
  { id:"posto",       label:"⛽ Posto / Serviço",    cls:"cat-posto",       color:"#A16207" },
  { id:"restaurante", label:"🍽️ Restaurante",         cls:"cat-restaurante", color:"#BE123C" },
  { id:"camping",     label:"🏕️ Camping",             cls:"cat-camping",     color:"#3F6212" },
  { id:"mirante",     label:"🌄 Mirante / Vista",    cls:"cat-mirante",     color:"#B45309" },
  { id:"fronteira",   label:"🛂 Fronteira / Balsa",  cls:"cat-fronteira",   color:"#475569" },
];

const REGION_COLORS = {
  "Patagônia Argentina": "#8B6914",
  "Carretera Austral":   "#1B6B3A",
  "Torres del Paine":    "#C0392B",
  "Tierra del Fuego":    "#1A5276",
  "Ushuaia":             "#0E6655",
  "Chile":               "#2471A3",
  "Retorno":             "#5D6D7E",
};

const RESERVAS = [];

// Roteiro começa vazio — adicione seus dias pelo app
const DEFAULT_DAYS = [];
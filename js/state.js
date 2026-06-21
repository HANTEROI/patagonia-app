// ─── js/state.js ─────────────────────────────────────────────────────────────

const state = {
  view: "map",
  selectedId: null,
  checked: {},
  reservas: {},
  diaries: {},
  media: {},
  days: JSON.parse(JSON.stringify(DEFAULT_DAYS)),
  pins: [],
  token: null,
  folderId: null,
  dayFolders: {},
  lightbox: null,
  editing: null,
  adding: false,
  addingPin: null,
  editingPin: null,
  uploading: {},
  testUsers: [],
};

function setState(patch) {
  Object.assign(state, patch);
  render();
}

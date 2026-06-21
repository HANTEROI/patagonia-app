// ─── js/drive.js ─────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = "218069105784-h1q5c88mca1j37o3takqqqrs2tjd8tis.apps.googleusercontent.com";
const DRIVE_FOLDER_NAME = "Patagônia 2024";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

function loadGSI() {
  return new Promise(r => {
    if (document.getElementById("gsi")) { r(); return; }
    const s = document.createElement("script");
    s.id = "gsi"; s.src = "https://accounts.google.com/gsi/client"; s.onload = r;
    document.head.appendChild(s);
  });
}

async function signIn() {
  await loadGSI();
  google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (resp) => {
      if (resp.error) { alert("Erro login: " + resp.error); return; }
      setState({ token: resp.access_token });
      await initDrive();
    },
  }).requestAccessToken();
}

async function driveAPI(path, opts = {}) {
  const res = await fetch("https://www.googleapis.com/drive/v3" + path, {
    ...opts,
    headers: {
      Authorization: "Bearer " + state.token,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function ensureFolder(name, parentId) {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`;
  const list = await driveAPI(`/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  if (list.files.length) return list.files[0].id;
  const body = { name, mimeType: "application/vnd.google-apps.folder", ...(parentId ? { parents: [parentId] } : {}) };
  const c = await driveAPI("/files?fields=id", { method: "POST", body: JSON.stringify(body) });
  return c.id;
}

async function initDrive() {
  const folderId = await ensureFolder(DRIVE_FOLDER_NAME);
  setState({ folderId });
  await loadCloudData();
  loadAllMedia();
}

async function loadCloudData() {
  if (!state.folderId) return;
  const q = `'${state.folderId}' in parents and name='data.json' and trashed=false`;
  const list = await driveAPI(`/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  if (!list.files.length) return;
  const data = await fetch(
    `https://www.googleapis.com/drive/v3/files/${list.files[0].id}?alt=media`,
    { headers: { Authorization: "Bearer " + state.token } }
  ).then(r => r.json()).catch(() => ({}));
  setState({
    diaries:  data.diaries  || {},
    checked:  data.checked  || {},
    reservas: data.reservas || {},
    pins:     data.pins     || [],
    pinsDone: data.pinsDone || {},
  });
}

async function saveCloudData() {
  if (!state.folderId || !state.token) return;
  const content = JSON.stringify({
    diaries:  state.diaries,
    checked:  state.checked,
    reservas: state.reservas,
    pins:     state.pins,
    pinsDone: state.pinsDone || {},
  });
  const q = `'${state.folderId}' in parents and name='data.json' and trashed=false`;
  const list = await driveAPI(`/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  const blob = new Blob([content], { type: "application/json" });
  const form = new FormData();
  if (list.files.length) {
    form.append("metadata", new Blob(["{}"], { type: "application/json" }));
    form.append("file", blob);
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${list.files[0].id}?uploadType=multipart`,
      { method: "PATCH", headers: { Authorization: "Bearer " + state.token }, body: form }
    );
  } else {
    form.append("metadata", new Blob([JSON.stringify({ name: "data.json", parents: [state.folderId] })], { type: "application/json" }));
    form.append("file", blob);
    await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      { method: "POST", headers: { Authorization: "Bearer " + state.token }, body: form }
    );
  }
}

async function loadAllMedia() {
  if (!state.folderId) return;
  const media = {};
  for (const day of state.days) {
    const q = `'${state.folderId}' in parents and name='day-${day.id}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const list = await driveAPI(`/files?q=${encodeURIComponent(q)}&fields=files(id)`);
    if (!list.files.length) continue;
    const dfId = list.files[0].id;
    state.dayFolders[day.id] = dfId;
    const files = await driveAPI(
      `/files?q='${dfId}' in parents and trashed=false&fields=files(id,name,mimeType,thumbnailLink)&orderBy=createdTime`
    );
    media[day.id] = files.files.map(f => ({
      id: f.id, name: f.name, mimeType: f.mimeType,
      thumb: f.thumbnailLink,
      url: `https://drive.google.com/uc?export=view&id=${f.id}`,
    }));
  }
  setState({ media });
}

async function uploadFile(dayId, file) {
  if (!state.token) return;
  let dfId = state.dayFolders[dayId];
  if (!dfId) {
    dfId = await ensureFolder(`day-${dayId}`, state.folderId);
    state.dayFolders[dayId] = dfId;
  }
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ name: file.name, parents: [dfId] })], { type: "application/json" }));
  form.append("file", file);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink",
    { method: "POST", headers: { Authorization: "Bearer " + state.token }, body: form }
  );
  const created = await res.json();
  const item = {
    id: created.id, name: created.name, mimeType: created.mimeType,
    thumb: created.thumbnailLink,
    url: `https://drive.google.com/uc?export=view&id=${created.id}`,
  };
  const prev = state.media[dayId] || [];
  setState({ media: { ...state.media, [dayId]: [...prev, item] } });
}

async function addTestUser(email) {
  const users = [...(state.testUsers || []), email];
  setState({ testUsers: users });
}
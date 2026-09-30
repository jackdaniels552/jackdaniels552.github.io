document.addEventListener("DOMContentLoaded", init);

const APP_CONFIG = {
  logoImg: "https://trugrind.net/assets/img/TruGrindtransparent.png",
  title: "Unoffical Thunderstore Modpack Generator",
  subtitle: "Generator",
  SOCIALS: [
    { url: "https://github.com/", icon: "🐙", enabled: true },
    { url: "https://twitter.com/", icon: "🐦", enabled: false },
    { url: "https://discord.com/", icon: "💬", enabled: true }
  ],
  animation: { fallingSnow: true },
  visitorCounter: true,   // shows a visit count in the footer (needs proxy.py)
  // Thunderstore blocks direct browser requests (CORS), so point "base" at your own proxy,
  // e.g. "https://ts-proxy.yourname.workers.dev" or "/ts" (see worker.js / README notes).
  thunderstore: { base: "https://pxy.trugrind.net", community: "valheim" }
};

const FIELD_MAP = { manifestName: "name", manifestVersion: "version_number", manifestWebsite: "website_url", manifestDescription: "description" };
const RE_NAME = /^[A-Za-z0-9_]+$/;
const RE_VERSION = /^\d+\.\d+\.\d+$/;
const RE_DEP = /^[A-Za-z0-9_]+-[A-Za-z0-9_]+-\d+\.\d+\.\d+$/;

function $(id) { return document.getElementById(id); }
function randomString(prefix) { return prefix + Math.random().toString(36).substring(2, 8); }
function rnd(n) { return Math.floor(Math.random() * n); }

const state = {
  manifest: {
    name: randomString("Modpack_"),
    version_number: `0.${rnd(10)}.${rnd(10)}`,
    website_url: `https://example${rnd(100)}.com/`,
    description: "This is a random description",
    dependencies: []
  },
  iconBlob: null,
  iconUrl: null,
  editingIndex: null,
  editingIsNew: false
};

function init() {
  initBranding();
  renderSocialLinks();
  renderManifest();
  renderDeps();
  initAnimations();

  Object.entries(FIELD_MAP).forEach(([id, key]) => {
    const input = $(id);
    input.value = state.manifest[key];
    input.addEventListener("focus", () => input.select());
    input.addEventListener("input", () => { state.manifest[key] = input.value; renderManifest(); });
  });

  $("addDep").addEventListener("click", addDep);
  $("searchDep").addEventListener("click", openSearchModal);
  $("searchGo").addEventListener("click", runSearch);
  $("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") runSearch(); });
  $("exportZip").addEventListener("click", openExportModal);
  $("loadZipBtn").addEventListener("click", loadZip);
  $("iconInput").addEventListener("change", handleIconUpload);
  initMarkdownToolbars();
  loadVisitorCount();
  $("changelogToggle").addEventListener("change", syncChangelogBox);

  $("editInput").addEventListener("keydown", e => { if (e.key === "Enter") saveEditDep(); });
  $("exportFilename").addEventListener("keydown", e => { if (e.key === "Enter") exportZip(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if ($("editModal").classList.contains("show")) closeEditModal();
    closeExportModal();
    closeSearchModal();
    closeMessageModal();
  });
}

// Branding
function initBranding() {
  $("brandLogo").src = APP_CONFIG.logoImg;
  $("brandTitle").innerText = APP_CONFIG.title;
  $("brandSubtitle").innerText = APP_CONFIG.subtitle;
}

function renderSocialLinks() {
  const c = $("sidebarSocials"); c.innerHTML = "";
  APP_CONFIG.SOCIALS.filter(s => s.enabled).forEach(s => {
    const a = document.createElement("a");
    a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.innerText = s.icon;
    c.appendChild(a);
  });
}

function renderManifest() { $("manifestPreview").innerText = JSON.stringify(state.manifest, null, 2); }

// Dependencies
function addDep() {
  state.manifest.dependencies.push("");
  state.editingIsNew = true;
  renderDeps();
  openEditModal(state.manifest.dependencies.length - 1, true);
}

function renderDeps() {
  const c = $("depsList"); c.innerHTML = "";
  state.manifest.dependencies.forEach((dep, idx) => {
    const div = document.createElement("div"); div.className = "dep-item";
    const span = document.createElement("span"); span.innerText = dep; div.appendChild(span);
    const edit = document.createElement("button"); edit.className = "edit"; edit.innerText = "✏️"; edit.title = "Edit";
    edit.onclick = () => openEditModal(idx, false);
    const del = document.createElement("button"); del.className = "delete"; del.innerText = "🗑️"; del.title = "Delete";
    del.onclick = () => confirmDeleteDep(idx);
    div.appendChild(edit); div.appendChild(del); c.appendChild(div);
  });
  renderManifest();
}

// Modals
function openEditModal(idx, isNew) {
  state.editingIndex = idx; state.editingIsNew = !!isNew;
  $("editInput").value = state.manifest.dependencies[idx];
  $("editInput").placeholder = "Author-ModName-1.0.0 (or paste a Thunderstore link)";
  $("editModal").classList.add("show");
  $("editInput").focus();
}

function closeEditModal() {
  // Cancelling a brand-new dependency discards the empty entry
  if (state.editingIsNew && state.editingIndex !== null && state.manifest.dependencies[state.editingIndex] === "") {
    state.manifest.dependencies.splice(state.editingIndex, 1);
    renderDeps();
  }
  $("editModal").classList.remove("show");
  state.editingIndex = null; state.editingIsNew = false;
}

// Turn whatever was pasted into Author-Name-1.0.0, or explain exactly what's wrong
function parseDependency(raw) {
  let v = raw.trim().replace(/^["'\s]+|["',\s]+$/g, "");   // pasted from JSON: "Author-Name-1.0.0",
  if (!v) return { error: "Enter a dependency like Author-ModName-1.0.0." };

  // Thunderstore page URLs: .../p/Author/Name/[v/1.2.3/]  or  .../package/Author/Name/[1.2.3/]
  const url = v.match(/thunderstore\.io\/(?:c\/[^/]+\/p|package)\/([^/?#]+)\/([^/?#]+)(?:\/(?:v\/)?(\d+\.\d+\.\d+))?/i);
  if (url) {
    if (!url[3]) return { error: `That link has no version. Type it as ${url[1]}-${url[2]}-x.y.z (the version is shown on the mod's page).`, prefill: `${url[1]}-${url[2]}-`, link: { ns: url[1], name: url[2] } };
    v = `${url[1]}-${url[2]}-${url[3]}`;
  }
  v = v.replace(/^([^/\s]+)\/([^/\s]+)\/v?(\d+\.\d+\.\d+)$/, "$1-$2-$3");   // Author/Name/1.0.0
  v = v.replace(/-v(\d+\.\d+\.\d+)$/i, "-$1");                                  // Author-Name-v1.0.0

  if (/\s/.test(v)) return { error: "Dependencies can't contain spaces. Thunderstore uses underscores in mod names (e.g. My_Mod)." };
  if (RE_DEP.test(v)) return { value: v };

  const m = v.match(/^(.*)-(\d+(?:\.\d+)*)$/);
  if (!m) return { error: `"${v}" has no version at the end. Use Author-ModName-1.0.0.` };
  if (!RE_VERSION.test(m[2])) return { error: `Version "${m[2]}" must have exactly three numbers, like 1.0.0.` };
  const parts = m[1].split("-");
  if (parts.length < 2) return { error: `"${v}" is missing the author or mod name. Use Author-ModName-1.0.0.` };
  if (parts.length > 2) return { error: `"${m[1]}" has extra hyphens. Author and mod name are each one word (underscores allowed, no hyphens).` };
  const bad = parts.find(p => !RE_NAME.test(p));
  return { error: `"${bad}" contains characters Thunderstore doesn't allow. Use only letters, numbers and underscores.` };
}

async function saveEditDep() {
  const raw = $("editInput").value.trim();
  if (!raw) { closeEditModal(); return; }   // empty: discard (removes a brand-new entry)
  const result = parseDependency(raw);
  let value = result.value || raw;          // otherwise keep exactly what was typed
  if (result.link) {                        // Thunderstore link without a version: look it up
    try { value = `${result.link.ns}-${result.link.name}-${await latestVersion(result.link.ns, result.link.name)}`; } catch (e) { /* keep raw text */ }
  }
  state.manifest.dependencies[state.editingIndex] = value;
  state.editingIsNew = false;
  closeEditModal();
  renderDeps();
}

function confirmDeleteDep(idx) {
  openMessageModal("Delete?", "Are you sure?", [
    { label: "Cancel", cls: "secondary", onClick: closeMessageModal },
    { label: "Delete", cls: "primary", onClick: () => { state.manifest.dependencies.splice(idx, 1); closeMessageModal(); renderDeps(); } }
  ]);
}

function openExportModal() { $("exportFilename").value = state.manifest.name; $("exportModal").classList.add("show"); }
function closeExportModal() { $("exportModal").classList.remove("show"); }

function okButton() { return { label: "OK", cls: "primary", onClick: closeMessageModal }; }

function openMessageModal(title, text, buttons) {
  $("messageTitle").innerText = title;
  $("messageText").innerText = text;
  const box = $("messageButtons"); box.innerHTML = "";
  buttons.forEach(b => {
    const btn = document.createElement("button");
    btn.className = "btn " + (b.cls || "primary"); btn.innerText = b.label; btn.onclick = b.onClick;
    box.appendChild(btn);
  });
  $("messageModal").classList.add("show");
}
function closeMessageModal() { $("messageModal").classList.remove("show"); }

// Validation (Thunderstore rules)
function validateManifest() {
  const m = state.manifest, errors = [];
  if (!RE_NAME.test(m.name || "")) errors.push("Name may only contain letters, numbers and underscores.");
  if (!RE_VERSION.test(m.version_number || "")) errors.push("Version must look like 1.0.0.");
  if ((m.description || "").length > 250) errors.push("Description must be 250 characters or fewer.");
  if (m.website_url && !/^https?:\/\//i.test(m.website_url)) errors.push("Website URL must start with http:// or https://.");
  if (!state.iconBlob) errors.push("An icon is required (256x256 PNG).");
  return errors;
}

// Icon handling: crop to square, resize to 256x256 PNG
function showIcon(blob) {
  if (state.iconUrl) URL.revokeObjectURL(state.iconUrl);
  state.iconBlob = blob;
  state.iconUrl = URL.createObjectURL(blob);
  const img = document.createElement("img"); img.src = state.iconUrl; img.alt = "Icon preview";
  $("iconPreview").innerHTML = ""; $("iconPreview").appendChild(img);
}

function processIconFile(file, onError) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    if (img.width < 256 || img.height < 256) { onError("Image too small, must be at least 256x256."); return; }
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
    canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
    canvas.toBlob(b => b ? showIcon(b) : onError("Could not process the image."), "image/png");
  };
  img.onerror = () => { URL.revokeObjectURL(url); onError("Could not read that image."); };
  img.src = url;
}

function handleIconUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  processIconFile(file, msg => { openMessageModal("Error", msg, [okButton()]); $("iconInput").value = ""; });
}

// Load ZIP
function findEntry(zip, name) {
  return Object.values(zip.files).find(f => !f.dir && f.name.split("/").pop().toLowerCase() === name);
}

function loadZip() {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".zip";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const mf = findEntry(zip, "manifest.json");
      if (!mf) throw new Error("No manifest.json found in this zip.");
      const parsed = JSON.parse((await mf.async("string")).replace(/^\uFEFF/, ""));
      state.manifest = {
        name: String(parsed.name ?? ""),
        version_number: String(parsed.version_number ?? "1.0.0"),
        website_url: String(parsed.website_url ?? ""),
        description: String(parsed.description ?? ""),
        dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.map(String) : []
      };
      Object.entries(FIELD_MAP).forEach(([id, key]) => { $(id).value = state.manifest[key]; });
      renderDeps();

      const rd = findEntry(zip, "readme.md");
      $("readmeEditor").value = rd ? await rd.async("string") : "";

      const cl = findEntry(zip, "changelog.md");
      $("changelogEditor").value = cl ? await cl.async("string") : "";
      $("changelogToggle").checked = !!cl;
      syncChangelogBox();

      const ic = findEntry(zip, "icon.png");
      if (ic) {
        const blob = await ic.async("blob");
        processIconFile(new Blob([blob], { type: "image/png" }), msg =>
          openMessageModal("Icon problem", msg + " Please upload a new icon.", [okButton()]));
      } else {
        state.iconBlob = null; $("iconPreview").innerHTML = "";
      }
    } catch (err) {
      openMessageModal("Could not load modpack", err.message || "Invalid zip file.", [okButton()]);
    }
  };
  input.click();
}

// Export ZIP
function exportZip() {
  const filename = $("exportFilename").value.trim().replace(/[^\w.-]+/g, "_");
  if (!filename) { openMessageModal("Error", "Filename required.", [okButton()]); return; }
  const errors = validateManifest();
  if (errors.length) { closeExportModal(); openMessageModal("Fix these before exporting", errors.join("\n"), [okButton()]); return; }

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(state.manifest, null, 2));
  zip.file("README.md", $("readmeEditor").value);
  const changelog = $("changelogEditor").value;
  if ($("changelogToggle").checked && changelog.trim()) zip.file("CHANGELOG.md", changelog);
  zip.file("icon.png", state.iconBlob);
  zip.generateAsync({ type: "blob" }).then(content => saveAs(content, filename + ".zip"));
  closeExportModal();
}

// Falling snow
function initAnimations() {
  if (!APP_CONFIG.animation.fallingSnow) return;
  const overlay = $("animationOverlay");
  for (let i = 0; i < 100; i++) {
    const flake = document.createElement("div");
    flake.className = "snowflake";
    flake.style.left = Math.random() * 100 + "%";
    flake.style.animationDelay = Math.random() * 5 + "s";
    flake.style.animationDuration = (5 + Math.random() * 5) + "s";
    overlay.appendChild(flake);
  }
}

// ---------- Changelog (optional) ----------
function syncChangelogBox() { $("changelogBox").hidden = !$("changelogToggle").checked; }

// ---------- Markdown toolbar ----------
const MD_ACTIONS = [
  { label: "B", title: "Bold (Ctrl+B)", run: ta => mdWrap(ta, "**", "**", "bold text") },
  { label: "I", title: "Italic (Ctrl+I)", run: ta => mdWrap(ta, "*", "*", "italic text") },
  { label: "S", title: "Strikethrough", run: ta => mdWrap(ta, "~~", "~~", "text") },
  { label: "H1", title: "Heading 1", run: ta => mdHeading(ta, "# ") },
  { label: "H2", title: "Heading 2", run: ta => mdHeading(ta, "## ") },
  { label: "H3", title: "Heading 3", run: ta => mdHeading(ta, "### ") },
  { label: "•", title: "Bulleted list", run: ta => mdLines(ta, () => "- ", /^[-*+] /) },
  { label: "1.", title: "Numbered list", run: ta => mdLines(ta, i => `${i + 1}. `, /^\d+\. /) },
  { label: "❝", title: "Quote", run: ta => mdLines(ta, () => "> ", /^> ?/) },
  { label: "</>", title: "Code", run: ta => mdCode(ta) },
  { label: "🔗", title: "Link (Ctrl+K)", run: ta => mdLink(ta) }
];

function initMarkdownToolbars() {
  document.querySelectorAll(".md-toolbar").forEach(bar => {
    const ta = $(bar.dataset.target);
    const preview = document.createElement("div");
    preview.className = "md-preview"; preview.hidden = true;
    ta.insertAdjacentElement("afterend", preview);

    const buttons = MD_ACTIONS.map(a => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn secondary md-btn"; b.innerText = a.label; b.title = a.title;
      b.onclick = () => a.run(ta);
      bar.appendChild(b);
      return b;
    });

    const pv = document.createElement("button");
    pv.type = "button"; pv.className = "btn secondary md-btn"; pv.innerText = "Preview"; pv.title = "Toggle preview";
    pv.onclick = () => {
      const on = preview.hidden;
      if (on) preview.innerHTML = renderMarkdown(ta.value);
      preview.hidden = !on; ta.hidden = on;
      pv.classList.toggle("active", on);
      buttons.forEach(b => { b.disabled = on; });
    };
    bar.appendChild(pv);

    ta.addEventListener("keydown", e => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); MD_ACTIONS[0].run(ta); }
      else if (k === "i") { e.preventDefault(); MD_ACTIONS[1].run(ta); }
      else if (k === "k") { e.preventDefault(); mdLink(ta); }
    });
  });
}

// Replace a range using execCommand so the browser's undo stack keeps working
function mdReplace(ta, start, end, text) {
  ta.focus();
  ta.setSelectionRange(start, end);
  if (!document.execCommand || !document.execCommand("insertText", false, text)) {
    ta.setRangeText(text, start, end, "end");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function mdWrap(ta, before, after, placeholder) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.slice(s, e);
  // Toggle off if the selection is already wrapped
  if (sel && ta.value.slice(s - before.length, s) === before && ta.value.slice(e, e + after.length) === after) {
    mdReplace(ta, s - before.length, e + after.length, sel);
    ta.setSelectionRange(s - before.length, e - before.length);
    return;
  }
  const inner = sel || placeholder;
  mdReplace(ta, s, e, before + inner + after);
  ta.setSelectionRange(s + before.length, s + before.length + inner.length);
}

function mdLink(ta) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  const text = ta.value.slice(s, e) || "link text";
  const url = "https://";
  mdReplace(ta, s, e, `[${text}](${url})`);
  const urlStart = s + text.length + 3;
  ta.setSelectionRange(urlStart, urlStart + url.length);
}

function mdCode(ta) {
  const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  if (sel.includes("\n")) mdWrap(ta, "```\n", "\n```", "code");
  else mdWrap(ta, "`", "`", "code");
}

// Expand the selection to whole lines and return [start, end, lines]
function mdSelectedLines(ta) {
  const v = ta.value;
  const start = v.lastIndexOf("\n", ta.selectionStart - 1) + 1;
  let end = v.indexOf("\n", ta.selectionEnd);
  if (end === -1) end = v.length;
  return [start, end, v.slice(start, end).split("\n")];
}

// Toggle a per-line prefix (lists, quotes). `re` matches an existing prefix.
function mdLines(ta, prefixFor, re) {
  const [start, end, lines] = mdSelectedLines(ta);
  const allHave = lines.every(l => re.test(l));
  const out = lines.map((l, i) => allHave ? l.replace(re, "") : prefixFor(i) + l.replace(/^([-*+] |\d+\. |> ?)/, ""));
  mdReplace(ta, start, end, out.join("\n"));
  ta.setSelectionRange(start, start + out.join("\n").length);
}

function mdHeading(ta, prefix) {
  const [start, end, lines] = mdSelectedLines(ta);
  const out = lines.map(l => {
    const plain = l.replace(/^#{1,6}\s+/, "");
    return l.startsWith(prefix) && !l.startsWith(prefix + "#") ? plain : prefix + plain;
  });
  mdReplace(ta, start, end, out.join("\n"));
  ta.setSelectionRange(start, start + out.join("\n").length);
}

// ---------- Minimal, safe Markdown renderer (for the preview) ----------
function renderMarkdown(src) {
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = t => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const reH = /^(#{1,6})\s+(.*)$/, reUl = /^\s*[-*+]\s+(.*)$/, reOl = /^\s*\d+\.\s+(.*)$/, reQ = /^>\s?(.*)$/;
  const isBlock = l => reH.test(l) || reUl.test(l) || reOl.test(l) || reQ.test(l) || /^```/.test(l);

  const lines = src.replace(/\r/g, "").split("\n");
  const out = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    let m;
    if (/^```/.test(line)) {
      const code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
    } else if ((m = line.match(reH))) {
      out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++;
    } else if (reQ.test(line)) {
      const q = [];
      while (i < lines.length && reQ.test(lines[i])) q.push(inline(lines[i++].match(reQ)[1]));
      out.push(`<blockquote>${q.join("<br>")}</blockquote>`);
    } else if (reUl.test(line) || reOl.test(line)) {
      const ordered = reOl.test(line), re = ordered ? reOl : reUl, items = [];
      while (i < lines.length && re.test(lines[i])) items.push(`<li>${inline(lines[i++].match(re)[1])}</li>`);
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
    } else if (!line.trim()) {
      i++;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) para.push(inline(lines[i++]));
      out.push(`<p>${para.join("<br>")}</p>`);
    }
  }
  return out.join("\n") || "<p><em>Nothing to preview yet.</em></p>";
}

// ---------- Thunderstore search ----------
let searchToken = 0;

async function tsFetch(path) {
  const res = await fetch(APP_CONFIG.thunderstore.base + path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    // Include the start of the response body so the real reason is visible (e.g. a bot-block page)
    const body = (await res.text().catch(() => "")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    throw new Error(`HTTP ${res.status}${body ? ": " + body : ""}`);
  }
  return res.json();
}

async function latestVersion(ns, name) {
  const d = await tsFetch(`/api/experimental/package/${encodeURIComponent(ns)}/${encodeURIComponent(name)}/`);
  const v = d.latest && d.latest.version_number;
  if (!v) throw new Error("No version returned");
  return v;
}

// Accept a few possible response shapes defensively
function normalizePackage(p) {
  if (!p) return null;
  const latest = p.latest || p.latest_version || {};
  const ns = p.namespace || p.owner || (p.team && p.team.name);
  const name = p.name || p.package_name;
  if (!ns || !name) return null;
  return { namespace: ns, name, version: p.version_number || latest.version_number || "", description: p.description || latest.description || "" };
}

// Only keep results that actually contain every search word (ignores case, spaces, underscores)
function filterHits(list, term) {
  const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = term.split(/\s+/).map(norm).filter(Boolean);
  return list.map(normalizePackage).filter(p => p && words.every(w => norm(`${p.namespace}${p.name}${p.description}`).includes(w))).slice(0, 25);
}

function openSearchModal() { $("searchModal").classList.add("show"); $("searchInput").focus(); }
function closeSearchModal() { $("searchModal").classList.remove("show"); }
function setSearchStatus(msg) { $("searchStatus").innerText = msg; }

async function runSearch() {
  const term = $("searchInput").value.trim();
  if (!term) return;
  const token = ++searchToken;
  const box = $("searchResults"); box.innerHTML = "";
  setSearchStatus("Searching…");
  try {
    const c = encodeURIComponent(APP_CONFIG.thunderstore.community), q = encodeURIComponent(term);
    let data;
    try {
      data = await tsFetch(`/api/search?community=${c}&q=${q}`);          // provided by proxy.py
    } catch (err) {
      if (!String(err.message).startsWith("HTTP 404")) throw err;          // other proxies (nginx etc.) don't have it
      data = await tsFetch(`/api/experimental/frontend/c/${c}/packages/?q=${q}&search=${q}`);
    }
    if (token !== searchToken) return;   // a newer search replaced this one
    const hits = filterHits(Array.isArray(data) ? data : (data.packages || data.results || []), term);
    setSearchStatus(hits.length ? `${hits.length} result${hits.length > 1 ? "s" : ""}` : "No matches. Try a different spelling or fewer words.");
    hits.forEach(p => box.appendChild(searchItem(p)));
  } catch (err) {
    console.error("Thunderstore search failed:", err);
    const blocked = err instanceof TypeError;   // fetch() rejects with TypeError on CORS/network failures
    setSearchStatus(blocked
      ? "Thunderstore blocks direct browser requests. Set APP_CONFIG.thunderstore.base in app.js to a proxy (see worker.js). You can still add dependencies by hand."
      : `Thunderstore search failed (${err.message}). You can still add dependencies by hand.`);
  }
}

function searchItem(p) {
  const row = document.createElement("div"); row.className = "search-item";
  const info = document.createElement("div"); info.className = "info";
  const title = document.createElement("div"); title.className = "title"; title.innerText = `${p.name.replace(/_/g, " ")} by ${p.namespace}`;
  const desc = document.createElement("div"); desc.className = "desc"; desc.innerText = p.description; desc.title = p.description;
  info.appendChild(title); info.appendChild(desc);
  const btn = document.createElement("button"); btn.className = "btn primary"; btn.innerText = "Add";
  btn.onclick = () => addFromSearch(p, btn);
  row.appendChild(info); row.appendChild(btn);
  return row;
}

async function addFromSearch(p, btn) {
  btn.disabled = true; btn.innerText = "…";
  try {
    const version = p.version || await latestVersion(p.namespace, p.name);
    const dep = `${p.namespace}-${p.name}-${version}`;
    const deps = state.manifest.dependencies, prefix = `${p.namespace}-${p.name}-`;
    const existing = deps.findIndex(d => d.startsWith(prefix));
    if (existing >= 0) deps[existing] = dep; else deps.push(dep);   // same mod: update its version
    renderDeps();
    btn.innerText = "Added ✓";
  } catch (err) {
    console.error("Could not add dependency:", err);
    btn.disabled = false; btn.innerText = "Add";
    setSearchStatus(`Couldn't get the latest version of ${p.name} (${err.message}). Try again or add it by hand.`);
  }
}

// ---------- Visitor counter (optional, served by proxy.py) ----------
async function loadVisitorCount() {
  if (!APP_CONFIG.visitorCounter) return;
  try {
    const res = await fetch(APP_CONFIG.thunderstore.base + "/api/hit", { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    const el = $("visitorCount");
    el.innerText = `${d.total.toLocaleString()} visits (${d.today.toLocaleString()} today)`;
    el.hidden = false;
  } catch (err) { /* the counter is optional, so fail quietly */ }
}

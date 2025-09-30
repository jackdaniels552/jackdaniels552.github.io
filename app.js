// ========== SETTINGS ==========
const SHOW_ANIMATION_CONTROLS = false; // set false to hide animation toggles
const DEFAULT_ANIMATION = "halloween";      // default animation to start
// ===============================

const SOCIALS = [
  { name: "Twitter", url: "https://twitter.com/", icon: "fab fa-twitter" },
  { name: "GitHub", url: "https://github.com/", icon: "fab fa-github" },
  { name: "Discord", url: "https://discord.com/", icon: "fab fa-discord" }
];

const ANIMATIONS = [
  { id: "snow", symbols: ["❄","✻","❅"] },
  { id: "halloween", symbols: ["🎃","👻","🦇"] },
  { id: "christmas", symbols: ["🎄","🎅","⭐"] },
  { id: "easter", symbols: ["🥚","🐰","🌸"] },
  { id: "valentine", symbols: ["❤️","💖","💕"] }
];

let overlay, animationInterval = null, currentAnimation = null;
let dependencies = [], editingDependencyIndex = null, dependencyToDelete = null;

function init() {
  overlay = document.getElementById("animationOverlay");

 // Manifest Preview
 const manifestPreview = document.getElementById("manifestPreview");
manifestPreview.addEventListener("click", () => {
  manifestPreview.classList.toggle("expanded");
});


  // Sidebar animation controls
  const controls = document.getElementById("animationControls");
  if (SHOW_ANIMATION_CONTROLS) {
    ANIMATIONS.forEach(a => {
      const wrapper = document.createElement("div");
      wrapper.className = "toggle";
      wrapper.innerHTML = `<label>${a.id.charAt(0).toUpperCase()+a.id.slice(1)}</label>
        <label class="switch"><input type="checkbox" id="${a.id}"><span class="slider"></span></label>`;
      controls.appendChild(wrapper);

      document.getElementById(a.id).addEventListener("change", e =>
        handleToggle(a.id, e.target.checked)
      );
    });
  } else {
    controls.style.display = "none";
  }

  if (!SHOW_ANIMATION_CONTROLS && DEFAULT_ANIMATION) startAnimation(DEFAULT_ANIMATION);

  // Social icons
  const socialLinks = document.getElementById("socialLinks");
  SOCIALS.forEach(s => {
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.innerHTML = `<i class="${s.icon} fa-2x"></i>`;
    socialLinks.appendChild(a);
  });

  // Dependencies
  document.getElementById("addDependency").addEventListener("click", addDependency);
  document.getElementById("saveDependencyBtn").addEventListener("click", saveDependency);
  document.getElementById("cancelEditBtn").addEventListener("click", closeEditModal);

  // Modpack icon
  document.getElementById("iconBtn").addEventListener("click", () => document.getElementById("iconUpload").click());
  document.getElementById("iconUpload").addEventListener("change", previewIcon);

  // Export / Load
  document.getElementById("exportBtn").addEventListener("click", openExportModal);
  document.getElementById("confirmExportBtn").addEventListener("click", exportZip);
  document.getElementById("cancelExportBtn").addEventListener("click", closeExportModal);

  document.getElementById("loadBtn").addEventListener("click", () => document.getElementById("loadInput").click());
  document.getElementById("loadInput").addEventListener("change", loadZip);

  // Reset
  document.getElementById("resetBtn").addEventListener("click", resetInputs);

  // Delete confirmation
  document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
    if(dependencyToDelete !== null){
      dependencies.splice(dependencyToDelete,1);
      renderDependencies();
      updateManifestPreview();
      dependencyToDelete = null;
    }
    document.getElementById("confirmModal").classList.add("hidden");
  });
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
    dependencyToDelete = null;
    document.getElementById("confirmModal").classList.add("hidden");
  });

  document.getElementById("closeErrorBtn").addEventListener("click", closeErrorModal);

  updateManifestPreview();
}

// ------------------- MANIFEST -------------------
function getManifest() {
  return {
    name: "Valhiem_Modpack",
    version_number: document.getElementById("version").value || "0.0.1",
    website_url: document.getElementById("website").value || "https://example.com",
    description: document.getElementById("description").value || "",
    dependencies: [...dependencies]
  };
}

function updateManifestPreview() {
  document.getElementById("manifestPreview").textContent = JSON.stringify(getManifest(), null, 2);
}

// ------------------- DEPENDENCIES -------------------
function addDependency() {
  dependencies.push("New-Dependency-1.0.0");
  renderDependencies();
  updateManifestPreview();
}

function renderDependencies() {
  const container = document.getElementById("dependencyList");
  container.innerHTML = "";
  dependencies.forEach((dep, idx) => {
    const div = document.createElement("div");
    div.className = "dependency-item";
    div.innerHTML = `<span>${dep}</span>
      <div>
        <i class="fa fa-edit" data-idx="${idx}"></i>
        <i class="fa fa-trash" data-idx="${idx}"></i>
      </div>`;
    container.appendChild(div);

    div.querySelector(".fa-edit").addEventListener("click", () => openEditModal(idx));
    div.querySelector(".fa-trash").addEventListener("click", () => deleteDependency(idx));
  });
}

function openEditModal(idx) {
  editingDependencyIndex = idx;
  document.getElementById("editDependencyInput").value = dependencies[idx];
  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

function saveDependency() {
  const val = document.getElementById("editDependencyInput").value.trim();
  if(editingDependencyIndex !== null && val !== ""){
    dependencies[editingDependencyIndex] = val;
    renderDependencies();
    updateManifestPreview();
    closeEditModal();
  }
}

function deleteDependency(idx) {
  dependencyToDelete = idx;
  document.getElementById("confirmModal").classList.remove("hidden");
}

// ------------------- MODPACK ICON -------------------
function previewIcon(e){
  const file = e.target.files[0];
  if(!file) return;
  const img = new Image();
  img.onload = () => {
    if(img.width < 256 || img.height < 256){ showError("Icon must be at least 256x256 pixels"); return; }
    const preview = document.getElementById("iconPreview");
    preview.innerHTML = "";
    preview.appendChild(img);
  };
  img.src = URL.createObjectURL(file);
}

// ------------------- ERROR MODAL -------------------
function showError(msg){
  document.getElementById("errorMessage").textContent = msg;
  document.getElementById("errorModal").classList.remove("hidden");
}
function closeErrorModal(){ document.getElementById("errorModal").classList.add("hidden"); }

// ------------------- EXPORT -------------------
function openExportModal(){ 
  document.getElementById("exportNameInput").value=""; 
  document.getElementById("exportModal").classList.remove("hidden"); 
}
function closeExportModal(){ document.getElementById("exportModal").classList.add("hidden"); }

function exportZip(){
  const filename = document.getElementById("exportNameInput").value.trim();
  if(!filename || filename.includes(" ")){ showError("Filename cannot be empty or contain spaces"); return; }

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(getManifest(), null, 2));
  zip.file("README.md", document.getElementById("readme").value || "");

  const iconFile = document.getElementById("iconUpload").files[0];
  if(iconFile) zip.file("icon.png", iconFile);

  zip.generateAsync({type:"blob"}).then(content => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = filename + ".zip";
    a.click();
    closeExportModal();
  });
}

// ------------------- LOAD -------------------
function loadZip(e){
  const file = e.target.files[0];
  if(!file) return;
  JSZip.loadAsync(file).then(zip => {
    if(zip.files["manifest.json"]) zip.files["manifest.json"].async("string").then(text => {
      const data = JSON.parse(text);
      document.getElementById("version").value = data.version_number || "";
      document.getElementById("website").value = data.website_url || "";
      document.getElementById("description").value = data.description || "";
      dependencies = data.dependencies || [];
      renderDependencies();
      updateManifestPreview();
    });
    if(zip.files["README.md"]) zip.files["README.md"].async("string").then(text => document.getElementById("readme").value = text);
    if(zip.files["icon.png"]) zip.files["icon.png"].async("blob").then(blob => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      const preview = document.getElementById("iconPreview");
      preview.innerHTML = "";
      preview.appendChild(img);
    });
  });
}

// ------------------- RESET -------------------
function resetInputs() {
  document.getElementById("version").value = "";
  document.getElementById("website").value = "";
  document.getElementById("description").value = "";
  document.getElementById("readme").value = "";
  document.getElementById("iconUpload").value = "";
  document.getElementById("iconPreview").innerHTML = "";
  dependencies = [];
  renderDependencies();
  updateManifestPreview();
}

// ------------------- ANIMATIONS -------------------
function handleToggle(id, enabled){
  ANIMATIONS.forEach(a => { if(a.id !== id) document.getElementById(a.id).checked = false; });
  if(enabled) startAnimation(id); else stopAnimation();
}

function startAnimation(type){
  stopAnimation();
  currentAnimation = type;
  const anim = ANIMATIONS.find(a=>a.id===type);

  animationInterval = setInterval(()=>{
    const wrapper = document.createElement("div");
    wrapper.style.left = Math.random() * window.innerWidth + "px";
    wrapper.style.position = "absolute";
    wrapper.style.top = "-50px";
    wrapper.style.pointerEvents = "none";
    wrapper.style.zIndex = "0";

    const el = document.createElement("div");
    el.textContent = anim.symbols[Math.floor(Math.random()*anim.symbols.length)];
    el.style.fontSize = 35 + Math.random()*20 + "px";
    el.style.opacity = 0.6 + Math.random()*0.4;
    el.style.animation = `sway ${2 + Math.random()*2}s ease-in-out infinite`;

    wrapper.appendChild(el);
    wrapper.style.animation = `fall ${8 + Math.random()*5}s linear forwards`;
    overlay.appendChild(wrapper);

    setTimeout(()=>wrapper.remove(), 14000);
  }, 400);
}

function stopAnimation(){ 
  clearInterval(animationInterval); 
  animationInterval=null; 
  overlay.innerHTML=""; 
  currentAnimation=null; 
}

window.addEventListener("DOMContentLoaded", init);



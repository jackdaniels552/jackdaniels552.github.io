let modpack = [];
const searchInput = document.getElementById("modSearch");
const searchButton = document.getElementById("searchButton");
const searchResults = document.getElementById("searchResults");
const modpackList = document.getElementById("modpackList");
const exportBtn = document.getElementById("exportBtn");

let typingTimer;
const typingDelay = 800; // ms

function renderMods(mods) {
  searchResults.innerHTML = "";
  mods.forEach(mod => {
    const card = document.createElement("div");
    card.classList.add("mod-card");
    card.innerHTML = `
      <img src="${mod.image}" alt="${mod.name}">
      <h3>${mod.name}</h3>
      <p>${mod.description}</p>
      <button class="addBtn"><i class="fas fa-plus"></i> Add</button>
    `;
    card.querySelector(".addBtn").onclick = () => addMod(mod);
    searchResults.appendChild(card);
  });
}

function renderModpack() {
  modpackList.innerHTML = "";
  modpack.forEach((mod, idx) => {
    const card = document.createElement("div");
    card.classList.add("modpack-card");
    card.innerHTML = `
      <img src="${mod.image}" alt="${mod.name}">
      <h3>${mod.name}</h3>
      <button class="removeBtn"><i class="fas fa-trash"></i> Remove</button>
    `;
    card.querySelector(".removeBtn").onclick = () => {
      if(confirm(`Remove ${mod.name} from modpack?`)) {
        modpack.splice(idx, 1);
        renderModpack();
      }
    };
    modpackList.appendChild(card);
  });
}

function addMod(mod) {
  if(!modpack.find(m => m.name === mod.name)) {
    modpack.push(mod);
    renderModpack();
  } else {
    alert(`${mod.name} is already in the modpack`);
  }
}

async function performSearch() {
  const query = searchInput.value.trim();
  if(!query) return;
  const mods = await searchMods(query);
  if(mods.length === 0) {
    searchResults.innerHTML = "<p>No mods found.</p>";
  } else {
    renderMods(mods);
  }
}

searchInput.addEventListener("keyup", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(performSearch, typingDelay);
});

searchButton.addEventListener("click", performSearch);

exportBtn.addEventListener("click", () => {
  if(modpack.length === 0) return alert("No mods in modpack");
  const zipName = prompt("Enter a name for your modpack ZIP:", "ValheimModpack") || "ValheimModpack";
  const zip = new JSZip();
  modpack.forEach(mod => {
    zip.file(`${mod.name}.txt`, `Name: ${mod.name}\nURL: ${mod.url}\nDescription: ${mod.description}`);
  });
  zip.generateAsync({type:"blob"}).then(content => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = zipName + ".zip";
    a.click();
  });
});

// Simple visitor counter using localStorage
const visitorCounter = document.getElementById("visitorCount");
let visitors = localStorage.getItem("visitors") || 0;
visitors++;
localStorage.setItem("visitors", visitors);
visitorCounter.textContent = "Visitors: " + visitors;

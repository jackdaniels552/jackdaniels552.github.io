let modpack = [];
const modpackList = document.getElementById("modpackList");
const visitorCountEl = document.getElementById("visitorCount");

// Unique visitor counter (simple localStorage for demo)
let count = localStorage.getItem("visitorCount") || 0;
count++;
visitorCountEl.textContent = count;
localStorage.setItem("visitorCount", count);

const searchInput = document.getElementById("modSearch");
let searchTimeout;

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(searchInput.value), 1000);
});

document.getElementById("searchBtn").addEventListener("click", () => performSearch(searchInput.value));

function performSearch(query) {
    if (!query) return;
    searchMods(query);
}

function addToModpack(mod) {
    if (modpack.find(m => m.id === mod.id)) return alert("Mod already added!");
    modpack.push(mod);
    renderModpack();
}

function removeFromModpack(id) {
    if (!confirm("Remove this mod from the modpack?")) return;
    modpack = modpack.filter(m => m.id !== id);
    renderModpack();
}

function renderModpack() {
    modpackList.innerHTML = "";
    modpack.forEach(mod => {
        const li = document.createElement("li");
        li.textContent = mod.name;
        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        removeBtn.onclick = () => removeFromModpack(mod.id);
        li.appendChild(removeBtn);
        modpackList.appendChild(li);
    });
}

// Export modpack
document.getElementById("exportBtn").addEventListener("click", async () => {
    if (modpack.length === 0) return alert("No mods in modpack!");
    const zipName = prompt("Enter modpack name:", "MyModpack");
    if (!zipName) return;

    // Validate modpack (check for duplicate names)
    const names = modpack.map(m => m.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) alert("Warning: Duplicate mod names detected!");

    const zip = new JSZip();
    zip.file("modpack.json", JSON.stringify(modpack, null, 2));
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${zipName}.zip`;
    a.click();
});

const modsList = document.getElementById('modsList');
const modSearch = document.getElementById('modSearch');
const searchBtn = document.getElementById('searchBtn');
const dependenciesList = document.getElementById('dependenciesList');
const addDepBtn = document.getElementById('addDepBtn');
const exportBtn = document.getElementById('exportBtn');
const visitorCountEl = document.getElementById('visitorCount');

let dependencies = [];
let searchTimeout;

// Visitor Counter (simple using localStorage)
let visitors = parseInt(localStorage.getItem('visitors') || 0);
visitors++;
localStorage.setItem('visitors', visitors);
visitorCountEl.textContent = `Visitors: ${visitors}`;

// Search with debounce
modSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch();
    }, 800);
});

searchBtn.addEventListener('click', performSearch);

async function performSearch() {
    const query = modSearch.value.trim();
    modsList.innerHTML = `<p>Searching...</p>`;
    const mods = await searchMods(query);

    if (!mods.length) {
        modsList.innerHTML = `<p>No mods found.</p>`;
        return;
    }

    modsList.innerHTML = '';
    mods.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'mod-card';
        card.innerHTML = `
            <img src="${mod.icon}" alt="${mod.displayName}" />
            <h3>${mod.displayName}</h3>
            <p>${mod.description}</p>
            <button onclick="addDependency('${mod.name}', '${mod.displayName}')">
                <i class="fas fa-plus"></i> Add
            </button>
        `;
        modsList.appendChild(card);
    });
}

function addDependency(name, displayName) {
    if (dependencies.some(d => d.name === name)) return;
    dependencies.push({ name, displayName });
    renderDependencies();
}

function renderDependencies() {
    dependenciesList.innerHTML = '';
    dependencies.forEach((dep, i) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${dep.displayName}
            <button onclick="removeDependency(${i})"><i class="fas fa-trash"></i></button>
        `;
        dependenciesList.appendChild(li);
    });
}

function removeDependency(index) {
    dependencies.splice(index, 1);
    renderDependencies();
}

addDepBtn.addEventListener('click', () => {
    const depName = prompt("Enter dependency package name:");
    if (depName) {
        addDependency(depName, depName);
    }
});

exportBtn.addEventListener('click', async () => {
    const zipName = prompt("Enter name for your modpack zip:", "modpack.zip");
    if (!zipName) return;

    const zip = new JSZip();
    zip.file("modpack.json", JSON.stringify({ dependencies }, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = zipName.endsWith(".zip") ? zipName : zipName + ".zip";
    link.click();
});

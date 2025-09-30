async function searchMods(query) {
    const resultsEl = document.getElementById("modResults");
    resultsEl.innerHTML = "<p>Loading...</p>";

    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://thunderstore.io/api/experimental/package/?query=${query}&game=valheim`)}`);
        const data = await res.json();
        const packages = JSON.parse(data.contents).data;

        if (!packages || packages.length === 0) {
            resultsEl.innerHTML = "<p>No mods found.</p>";
            return;
        }

        resultsEl.innerHTML = "";
        packages.forEach(pkg => {
            const card = document.createElement("div");
            card.className = "mod-card frosted";
            card.innerHTML = `
                <img src="${pkg.latest_file.display_icon || 'https://via.placeholder.com/150'}" alt="${pkg.name}">
                <h3>${pkg.name}</h3>
                <p>${pkg.latest_file.description || "No description"}</p>
                <button onclick='addToModpack(${JSON.stringify({id: pkg.id, name: pkg.name})})'><i class="fa-solid fa-plus"></i> Add</button>
            `;
            resultsEl.appendChild(card);
        });
    } catch (e) {
        console.error("Error fetching mods:", e);
        resultsEl.innerHTML = "<p>Error fetching mods.</p>";
    }
}

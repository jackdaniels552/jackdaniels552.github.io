const THUNDERSTORE_API = "https://thunderstore.io/api/experimental/package/";

async function searchMods(query) {
    if (!query) return [];
    const proxy = "https://api.allorigins.win/get?url=";
    const url = `${THUNDERSTORE_API}?query=${encodeURIComponent(query)}&game=valheim`;

    try {
        const res = await fetch(proxy + encodeURIComponent(url));
        const data = await res.json();
        const results = JSON.parse(data.contents).results || [];

        return results.map(m => ({
            name: m.package_name,
            displayName: m.display_name,
            description: m.summary,
            icon: m.icon_url
        }));
    } catch (e) {
        console.error("Error fetching mods:", e);
        return [];
    }
}

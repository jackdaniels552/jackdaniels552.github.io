const THUNDERSTORE_API = "https://thunderstore.io/api/experimental/package/";

async function searchMods(query) {
  try {
    const proxy = "https://api.allorigins.win/get?url=";
    const apiUrl = `${THUNDERSTORE_API}?query=${encodeURIComponent(query)}&game=valheim`;
    const res = await fetch(proxy + encodeURIComponent(apiUrl));
    const dataText = await res.json();
    const data = JSON.parse(dataText.contents);

    if (!data.packages || data.packages.length === 0) return [];

    return data.packages.map(mod => ({
      name: mod.display_name || mod.package_name,
      description: mod.summary || "No description",
      image: mod.icon ? "https://thunderstore.io" + mod.icon : "placeholder.png",
      url: "https://thunderstore.io/package/" + mod.package_name
    }));
  } catch (err) {
    console.error("Error fetching mods:", err);
    return [];
  }
}

// Public credentials (RLS-protected, safe to expose)
const SUPABASE_URL = "https://dsozrejgzoluitgpfdxw.supabase.co";
const SUPABASE_KEY = "sb_publishable_PQT-st0gD0n4d5cMZnHYxw_mJmjYPJD";

function createLocationIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2C7.6 2 4 5.6 4 10c0 5.6 8 12 8 12s8-6.4 8-12c0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z");
  svg.appendChild(path);
  return svg;
}

function createOrganizerIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z");
  svg.appendChild(path);
  return svg;
}

function createLinkIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1.1em");
  svg.setAttribute("height", "1.1em");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z");
  svg.appendChild(path);
  return svg;
}

const el = {
  filtersPanel: document.querySelector("#filtersPanel"),
  startDateFilter: document.querySelector("#startDateFilter"),
  endDateFilter: document.querySelector("#endDateFilter"),
  cityFilter: document.querySelector("#cityFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  resultInfo: document.querySelector("#resultInfo"),
  cards: document.querySelector("#cards"),
  cardTemplate: document.querySelector("#cardTemplate"),
  addSourceForm: document.querySelector("#addSourceForm"),
  srcName: document.querySelector("#srcName"),
  srcRootUrl: document.querySelector("#srcRootUrl"),
  srcEventsUrl: document.querySelector("#srcEventsUrl"),
  srcStreet: document.querySelector("#srcStreet"),
  srcPostalCode: document.querySelector("#srcPostalCode"),
  srcCity: document.querySelector("#srcCity"),
  srcNote: document.querySelector("#srcNote"),
  srcAddressSearch: document.querySelector("#srcAddressSearch"),
  addressSuggestions: document.querySelector("#addressSuggestions"),
  addSourceInfo: document.querySelector("#addSourceInfo"),
  reviewPanel: document.querySelector("#reviewPanel"),
  reviewInfo: document.querySelector("#reviewInfo"),
  reviewList: document.querySelector("#reviewList"),
  addSourceFabBtn: document.querySelector("#addSourceFabBtn"),
  addSourceModal: document.querySelector("#addSourceModal"),
  addSourceModalCloseBtn: document.querySelector("#addSourceModalCloseBtn")
};

function openAddSourceModal() {
  el.addSourceModal.hidden = false;
}

function closeAddSourceModal() {
  el.addSourceModal.hidden = true;
}

const OWNER_KEY_STORAGE = "eventatlas_owner_key";

function initOwnerKey() {
  const params = new URLSearchParams(window.location.search);
  const keyFromUrl = params.get("ownerKey");
  if (keyFromUrl) {
    localStorage.setItem(OWNER_KEY_STORAGE, keyFromUrl);
    params.delete("ownerKey");
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
  }
  return localStorage.getItem(OWNER_KEY_STORAGE) || null;
}

async function callRpc(fnName, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.message) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

async function handleAddSourceSubmit(evt) {
  evt.preventDefault();
  el.addSourceInfo.textContent = "Wird gesendet...";

  try {
    const result = await callRpc("submit_website", {
      p_name: el.srcName.value.trim(),
      p_root_url: el.srcRootUrl.value.trim() || null,
      p_events_url: el.srcEventsUrl.value.trim() || null,
      p_street: el.srcStreet.value.trim() || null,
      p_postal_code: el.srcPostalCode.value.trim() || null,
      p_city: el.srcCity.value.trim() || null,
      p_note: el.srcNote.value.trim() || null,
      p_secret: ownerKey
    });

    if (result.status === "added") {
      el.addSourceInfo.textContent = "Direkt hinzugefuegt.";
    } else {
      el.addSourceInfo.textContent = "Danke! Dein Vorschlag wurde eingereicht und wird geprueft.";
    }
    el.addSourceForm.reset();
    if (ownerKey) loadPendingSuggestions();
  } catch (err) {
    el.addSourceInfo.textContent = `Fehler: ${err.message}`;
  }
}

function renderSuggestion(item) {
  const card = document.createElement("article");
  card.className = "suggestion-card";

  const title = document.createElement("h4");
  title.textContent = item.name;
  card.appendChild(title);

  const details = [
    item.root_url ? `Website: ${item.root_url}` : null,
    item.events_url && item.events_url !== item.root_url ? `Events: ${item.events_url}` : null,
    item.street || item.postal_code ? `Adresse: ${item.street || ""} ${item.postal_code || ""} ${item.city || ""}`.trim() : null,
    item.note ? `Notiz: ${item.note}` : null
  ].filter(Boolean);

  details.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    card.appendChild(p);
  });

  const actions = document.createElement("div");
  actions.className = "suggestion-actions";

  const approveBtn = document.createElement("button");
  approveBtn.type = "button";
  approveBtn.className = "btn";
  approveBtn.textContent = "Uebernehmen";
  approveBtn.addEventListener("click", () => reviewSuggestion(item.id, "approve"));

  const rejectBtn = document.createElement("button");
  rejectBtn.type = "button";
  rejectBtn.className = "btn btn-reject";
  rejectBtn.textContent = "Ablehnen";
  rejectBtn.addEventListener("click", () => reviewSuggestion(item.id, "reject"));

  actions.appendChild(approveBtn);
  actions.appendChild(rejectBtn);
  card.appendChild(actions);

  return card;
}

async function loadPendingSuggestions() {
  el.reviewInfo.textContent = "Lade Vorschlaege...";
  try {
    const items = await callRpc("list_pending_suggestions", { p_secret: ownerKey });
    el.reviewList.innerHTML = "";
    if (!items.length) {
      el.reviewInfo.textContent = "Keine offenen Vorschlaege.";
      return;
    }
    el.reviewInfo.textContent = `${items.length} offene Vorschlaege`;
    items.forEach((item) => el.reviewList.appendChild(renderSuggestion(item)));
  } catch (err) {
    el.reviewInfo.textContent = `Fehler beim Laden: ${err.message}`;
  }
}

async function reviewSuggestion(id, action) {
  try {
    await callRpc("review_suggestion", { p_id: id, p_action: action, p_secret: ownerKey });
    loadPendingSuggestions();
  } catch (err) {
    el.reviewInfo.textContent = `Fehler: ${err.message}`;
  }
}

// Nominatim Geocoding API (OpenStreetMap - Open Source)
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

let addressSearchTimeout = null;
let addressSuggestions = [];

function escapeNominatimQuery(query) {
  // Escape special characters for Nominatim
  return encodeURIComponent(query);
}

async function searchAddress(query) {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "5",
      countrycodes: "de",
      "accept-language": "de"
    });

    const url = `${NOMINATIM_BASE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "EventAtlas/1.0 (https://github.com/yona-h/EventAtlas)"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.map(item => ({
      display_name: item.display_name,
      name: item.name || item.addresstype,
      street: item.address?.road || item.address?.street || item.address?.path || "",
      house_number: item.address?.house_number || "",
      postal_code: item.address?.postcode || "",
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.hamlet || "",
      full_address: item.display_name
    }));
  } catch (err) {
    console.error("Address search failed:", err);
    return [];
  }
}

function renderAddressSuggestions(suggestions) {
  addressSuggestions = suggestions;
  
  if (suggestions.length === 0) {
    el.addressSuggestions.hidden = true;
    return;
  }

  el.addressSuggestions.innerHTML = "";
  suggestions.forEach((suggestion, index) => {
    const div = document.createElement("div");
    div.className = "address-suggestion-item";
    div.dataset.index = index;

    const nameSpan = document.createElement("div");
    nameSpan.className = "suggestion-name";
    nameSpan.textContent = suggestion.name || suggestion.display_name.split(",")[0];

    const addressSpan = document.createElement("div");
    addressSpan.className = "suggestion-address";
    addressSpan.textContent = suggestion.full_address;

    div.appendChild(nameSpan);
    div.appendChild(addressSpan);

    div.addEventListener("click", () => selectAddressSuggestion(suggestion));

    el.addressSuggestions.appendChild(div);
  });

  el.addressSuggestions.hidden = false;
}

function selectAddressSuggestion(suggestion) {
  // Fill the address fields
  const streetParts = [suggestion.street, suggestion.house_number].filter(Boolean).join(" ");
  el.srcStreet.value = streetParts || suggestion.display_name.split(",")[0];
  el.srcPostalCode.value = suggestion.postal_code || "";
  el.srcCity.value = suggestion.city || "";
  el.srcAddressSearch.value = suggestion.display_name;
  
  // Hide suggestions
  el.addressSuggestions.hidden = true;
  addressSuggestions = [];
}

async function handleAddressSearchInput() {
  clearTimeout(addressSearchTimeout);
  
  const query = el.srcAddressSearch.value.trim();
  
  if (query.length < 3) {
    el.addressSuggestions.hidden = true;
    return;
  }

  addressSearchTimeout = setTimeout(async () => {
    const suggestions = await searchAddress(query);
    renderAddressSuggestions(suggestions);
  }, 300);
}

function handleAddressSearchFocus() {
  const query = el.srcAddressSearch.value.trim();
  if (query.length >= 3 && addressSuggestions.length > 0) {
    el.addressSuggestions.hidden = false;
  }
}

function handleAddressSearchBlur() {
  // Use setTimeout to allow click event to fire first
  setTimeout(() => {
    el.addressSuggestions.hidden = true;
  }, 200);
}

function handleAddressSearchKeydown(evt) {
  const suggestions = el.addressSuggestions.querySelectorAll(".address-suggestion-item");
  const currentIndex = Array.from(suggestions).findIndex(s => s.classList.contains("highlighted"));
  
  switch (evt.key) {
    case "ArrowDown":
      evt.preventDefault();
      if (suggestions.length > 0) {
        const nextIndex = (currentIndex + 1) % suggestions.length;
        suggestions.forEach(s => s.classList.remove("highlighted"));
        suggestions[nextIndex].classList.add("highlighted");
        suggestions[nextIndex].scrollIntoView({ block: "nearest" });
      }
      break;
    case "ArrowUp":
      evt.preventDefault();
      if (suggestions.length > 0) {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
        suggestions.forEach(s => s.classList.remove("highlighted"));
        suggestions[prevIndex].classList.add("highlighted");
        suggestions[prevIndex].scrollIntoView({ block: "nearest" });
      }
      break;
    case "Enter":
      evt.preventDefault();
      if (!el.addressSuggestions.hidden) {
        const highlighted = el.addressSuggestions.querySelector(".address-suggestion-item.highlighted");
        if (highlighted) {
          const index = parseInt(highlighted.dataset.index);
          selectAddressSuggestion(addressSuggestions[index]);
        } else if (suggestions.length > 0) {
          selectAddressSuggestion(addressSuggestions[0]);
        }
      }
      break;
    case "Escape":
      el.addressSuggestions.hidden = true;
      break;
  }
}

const ownerKey = initOwnerKey();
el.addSourceForm.addEventListener("submit", handleAddSourceSubmit);
el.addSourceFabBtn.addEventListener("click", openAddSourceModal);
el.addSourceModalCloseBtn.addEventListener("click", closeAddSourceModal);
el.addSourceModal.addEventListener("click", (evt) => {
  if (evt.target === el.addSourceModal) closeAddSourceModal();
});
document.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && !el.addSourceModal.hidden) closeAddSourceModal();
});
if (ownerKey) {
  el.reviewPanel.hidden = false;
  loadPendingSuggestions();
}

// Initialize address search
el.srcAddressSearch.addEventListener("input", handleAddressSearchInput);
el.srcAddressSearch.addEventListener("focus", handleAddressSearchFocus);
el.srcAddressSearch.addEventListener("blur", handleAddressSearchBlur);
el.srcAddressSearch.addEventListener("keydown", handleAddressSearchKeydown);

function initDateFilters() {
  const today = new Date();
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const formatDate = (d) => d.toISOString().split('T')[0];
  el.startDateFilter.value = formatDate(today);
  el.endDateFilter.value = formatDate(in3Days);
}

function formatTime(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(d);
}

function formatPrice(item) {
  if (item.is_free) return "Kostenlos";
  if (item.min_price_cents == null && item.max_price_cents == null) return "Preis n/a";

  const currency = item.currency_code || "EUR";
  const fmt = (cents) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency }).format((cents || 0) / 100);

  if (item.min_price_cents != null && item.max_price_cents != null) {
    return `${fmt(item.min_price_cents)} - ${fmt(item.max_price_cents)}`;
  }

  return item.min_price_cents != null ? `ab ${fmt(item.min_price_cents)}` : `bis ${fmt(item.max_price_cents)}`;
}

async function loadCategories() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/categories?select=id,slug,label,parent_id`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Failed to load categories:", err);
    return [];
  }
}

async function loadImages(eventIds) {
  if (!eventIds.length) return new Map();
  try {
    const ids = eventIds.map(id => `"${id}"`).join(',');
    const url = `${SUPABASE_URL}/rest/v1/events?select=id,cover_image_url&id=in.(${ids})`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    const map = new Map();
    rows.forEach(row => {
      if (row.cover_image_url) map.set(row.id, row.cover_image_url);
    });
    return map;
  } catch (err) {
    console.error("Failed to load images:", err);
    return new Map();
  }
}

function getTopLevelCategory(item, categoryMap) {
  if (!item.category_slugs || !item.category_slugs.length) return "Sonstige";
  for (const slug of item.category_slugs) {
    const cat = categoryMap.get(slug);
    if (cat && cat.parent_id === null) return cat.label;
    if (cat && cat.parentLabel) return cat.parentLabel;
  }
  return "Sonstige";
}

function renderGrouped(items, categoryMap, imageMap) {
  el.cards.innerHTML = "";

  if (!items.length) {
    el.cards.innerHTML = '<p class="muted">Keine Ergebnisse mit den aktuellen Filtern.</p>';
    return;
  }

  const byDay = new Map();
  items.forEach(item => {
    const day = item.starts_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(item);
  });

  const dayArray = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  dayArray.forEach(([day, dayItems]) => {
    const daySection = document.createElement("section");
    daySection.className = "day-group";

    const dayHeading = document.createElement("h3");
    dayHeading.className = "day-heading";
    dayHeading.textContent = new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date(day + "T00:00"));
    daySection.appendChild(dayHeading);

    const byCat = new Map();
    dayItems.forEach(item => {
      const cat = getTopLevelCategory(item, categoryMap);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(item);
    });

    const catArray = Array.from(byCat.entries()).sort((a, b) => a[0].localeCompare(b[0], "de"));

    catArray.forEach(([catLabel, catItems]) => {
      const catGroup = document.createElement("div");
      catGroup.className = "cat-group";

      const catHeading = document.createElement("p");
      catHeading.className = "cat-heading";
      catHeading.textContent = catLabel;
      catGroup.appendChild(catHeading);

      const cardsContainer = document.createElement("div");
      cardsContainer.className = "cards";

      catItems.forEach(item => {
        const node = el.cardTemplate.content.cloneNode(true);

        if (imageMap && imageMap.has(item.event_id)) {
          const img = document.createElement("img");
          img.src = imageMap.get(item.event_id);
          img.alt = "";
          img.loading = "lazy";
          node.querySelector(".card-image-slot").appendChild(img);
        }

        node.querySelector(".date").textContent = `${formatTime(item.starts_at)} Uhr`;
        node.querySelector(".price").textContent = formatPrice(item);
        node.querySelector(".title").textContent = item.title;

        const metaVenue = node.querySelector(".meta-venue");
        metaVenue.textContent = "";
        metaVenue.appendChild(createLocationIcon());
        metaVenue.appendChild(document.createTextNode(` ${item.venue_name || "Unbekannter Ort"}${item.city ? `, ${item.city}` : ""}`));

        const metaOrganizer = node.querySelector(".meta-organizer");
        if (item.organizer_name) {
          metaOrganizer.textContent = "";
          metaOrganizer.appendChild(createOrganizerIcon());
          metaOrganizer.appendChild(document.createTextNode(` ${item.organizer_name}`));
        } else {
          metaOrganizer.remove();
        }

        const desc = item.description || "Keine Beschreibung";
        const MAX_DESC = 140;
        node.querySelector(".desc").textContent = desc.length > MAX_DESC
          ? desc.slice(0, MAX_DESC).trimEnd() + " …"
          : desc;

        const chips = node.querySelector(".chips");
        if (item.is_recurring) {
          const recurringChip = document.createElement("span");
          recurringChip.className = "chip chip-recurring";
          recurringChip.textContent = "Wiederkehrend";
          chips.appendChild(recurringChip);
        }

        (item.category_labels || []).forEach((label) => {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.textContent = label;
          chips.appendChild(chip);
        });

        const links = node.querySelector(".links");
        if (item.ticket_url) {
          const a = document.createElement("a");
          a.href = item.ticket_url;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "Tickets";
          a.addEventListener("click", (evt) => evt.stopPropagation());
          links.appendChild(a);
        }

        const linkIcon = node.querySelector(".card-link-icon");
        if (item.event_url) {
          linkIcon.href = item.event_url;
          linkIcon.appendChild(createLinkIcon());
          linkIcon.addEventListener("click", (evt) => evt.stopPropagation());
        } else {
          linkIcon.remove();
        }

        const card = node.querySelector(".card");
        card.addEventListener("click", () => {
          window.location.href = `./detail.html?eventId=${encodeURIComponent(item.event_id)}`;
        });

        cardsContainer.appendChild(node);
      });

      catGroup.appendChild(cardsContainer);
      daySection.appendChild(catGroup);
    });

    el.cards.appendChild(daySection);
  });
}

function fillCategoryFilter(items) {
  const all = new Map();
  items.forEach((item) => {
    (item.category_slugs || []).forEach((slug, i) => {
      const label = (item.category_labels || [])[i] || slug;
      all.set(slug, label);
    });
  });

  const current = el.categoryFilter.value;
  el.categoryFilter.innerHTML = '<option value="">Alle</option>';

  [...all.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "de"))
    .forEach(([slug, label]) => {
      const opt = document.createElement("option");
      opt.value = slug;
      opt.textContent = label;
      el.categoryFilter.appendChild(opt);
    });

  if (current) el.categoryFilter.value = current;
}

async function loadFeed() {
  el.resultInfo.textContent = "Lade...";

  const startDate = el.startDateFilter.value;
  const endDate = el.endDateFilter.value;

  if (!startDate || !endDate) {
    el.resultInfo.textContent = "Bitte Start- und Enddatum setzen.";
    return;
  }

  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "starts_at.asc");
  params.append("starts_at", `gte.${startDate}`);
  params.append("starts_at", `lte.${endDate}`);
  params.set("limit", "200");

  const city = el.cityFilter.value.trim();
  if (city) params.set("city", `ilike.*${city}*`);

  const category = el.categoryFilter.value;
  if (category) params.set("category_slugs", `cs.{${category}}`);

  const url = `${SUPABASE_URL}/rest/v1/upcoming_event_cards?${params.toString()}`;

  try {
    const [data, categories] = await Promise.all([
      fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
      loadCategories()
    ]);

    fillCategoryFilter(data);
    const filtered = data;

    const categoryMap = new Map();
    categories.forEach(cat => {
      const parentLabel = categories.find(c => c.id === cat.parent_id)?.label;
      categoryMap.set(cat.slug, { ...cat, parentLabel });
    });

    const imageMap = await loadImages(filtered.map(i => i.event_id));

    renderGrouped(filtered, categoryMap, imageMap);
    el.resultInfo.textContent = `${filtered.length} Ergebnisse`;
  } catch (err) {
    el.resultInfo.textContent = `Fehler beim Laden: ${err.message}`;
    el.cards.innerHTML = "";
  }
}

function debounce(fn, delayMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

el.categoryFilter.addEventListener("change", loadFeed);
el.startDateFilter.addEventListener("change", loadFeed);
el.endDateFilter.addEventListener("change", loadFeed);
el.cityFilter.addEventListener("input", debounce(loadFeed, 400));

if (el.filtersPanel && !window.matchMedia("(min-width: 760px)").matches) {
  el.filtersPanel.open = false;
}

initDateFilters();
loadFeed();

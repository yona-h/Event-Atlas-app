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

const el = {
  startDateFilter: document.querySelector("#startDateFilter"),
  endDateFilter: document.querySelector("#endDateFilter"),
  cityFilter: document.querySelector("#cityFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  nextOnlyFilter: document.querySelector("#nextOnlyFilter"),
  loadBtn: document.querySelector("#loadBtn"),
  resultInfo: document.querySelector("#resultInfo"),
  cards: document.querySelector("#cards"),
  cardTemplate: document.querySelector("#cardTemplate")
};

function initDateFilters() {
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const formatDate = (d) => d.toISOString().split('T')[0];
  el.startDateFilter.value = formatDate(today);
  el.endDateFilter.value = formatDate(in30Days);
}

function formatDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
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

        node.querySelector(".date").textContent = `${formatDate(item.starts_at)} Uhr`;
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

          const indexChip = document.createElement("span");
          indexChip.className = "chip";
          indexChip.textContent = `Termin ${item.occurrence_index} von ${item.total_occurrences}`;
          chips.appendChild(indexChip);
        }

        (item.category_labels || []).forEach((label) => {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.textContent = label;
          chips.appendChild(chip);
        });

        const links = node.querySelector(".links");
        if (item.event_url) {
          const a = document.createElement("a");
          a.href = item.event_url;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "Eventseite";
          links.appendChild(a);
        }
        const detail = document.createElement("a");
        detail.href = `./detail.html?eventId=${encodeURIComponent(item.event_id)}`;
        detail.textContent = "Details";
        links.appendChild(detail);

        if (item.ticket_url) {
          const a = document.createElement("a");
          a.href = item.ticket_url;
          a.target = "_blank";
          a.rel = "noreferrer";
          a.textContent = "Tickets";
          links.appendChild(a);
        }

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

function keepNextOccurrencePerEvent(items) {
  const byEvent = new Map();
  for (const item of items) {
    if (!byEvent.has(item.event_id)) {
      byEvent.set(item.event_id, item);
    }
  }
  return [...byEvent.values()];
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
    const filtered = el.nextOnlyFilter.checked ? keepNextOccurrencePerEvent(data) : data;

    const categoryMap = new Map();
    categories.forEach(cat => {
      const parentLabel = categories.find(c => c.id === cat.parent_id)?.label;
      categoryMap.set(cat.slug, { ...cat, parentLabel });
    });

    const imageMap = await loadImages(filtered.map(i => i.event_id));

    renderGrouped(filtered, categoryMap, imageMap);
    el.resultInfo.textContent = `${filtered.length} Ergebnisse${el.nextOnlyFilter.checked ? " (naechster Termin je Event)" : ""}`;
  } catch (err) {
    el.resultInfo.textContent = `Fehler beim Laden: ${err.message}`;
    el.cards.innerHTML = "";
  }
}

el.loadBtn.addEventListener("click", loadFeed);
el.categoryFilter.addEventListener("change", loadFeed);
el.nextOnlyFilter.addEventListener("change", loadFeed);
el.startDateFilter.addEventListener("change", loadFeed);
el.endDateFilter.addEventListener("change", loadFeed);

initDateFilters();

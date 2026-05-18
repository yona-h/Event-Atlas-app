// Public credentials (RLS-protected, safe to expose)
const SUPABASE_URL = "https://dsozrejgzoluitgpfdxw.supabase.co";
const SUPABASE_KEY = "sb_publishable_PQT-st0gD0n4d5cMZnHYxw_mJmjYPJD";

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

function renderCards(items) {
  el.cards.innerHTML = "";

  if (!items.length) {
    el.cards.innerHTML = '<p class="muted">Keine Ergebnisse mit den aktuellen Filtern.</p>';
    return;
  }

  for (const item of items) {
    const node = el.cardTemplate.content.cloneNode(true);

    node.querySelector(".date").textContent = `${formatDate(item.starts_at)} Uhr`;
    node.querySelector(".price").textContent = formatPrice(item);
    node.querySelector(".title").textContent = item.title;
    node.querySelector(".meta").textContent = `${item.venue_name || "Unbekannter Ort"}${item.city ? `, ${item.city}` : ""}${item.organizer_name ? ` • ${item.organizer_name}` : ""}`;
    node.querySelector(".desc").textContent = item.description || "Keine Beschreibung";

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

    el.cards.appendChild(node);
  }
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
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    fillCategoryFilter(data);

    const filtered = el.nextOnlyFilter.checked ? keepNextOccurrencePerEvent(data) : data;

    renderCards(filtered);
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

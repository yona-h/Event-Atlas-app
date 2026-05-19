// Public credentials (RLS-protected, safe to expose)
const SUPABASE_URL = "https://dsozrejgzoluitgpfdxw.supabase.co";
const SUPABASE_KEY = "sb_publishable_PQT-st0gD0n4d5cMZnHYxw_mJmjYPJD";

const el = {
  detailTitle: document.querySelector("#detailTitle"),
  detailSubtitle: document.querySelector("#detailSubtitle"),
  detailStatus: document.querySelector("#detailStatus"),
  detailStatusPanel: document.querySelector("#detailStatusPanel"),
  detailMetaPanel: document.querySelector("#detailMetaPanel"),
  detailOccurrencesPanel: document.querySelector("#detailOccurrencesPanel"),
  metaVenue: document.querySelector("#metaVenue"),
  metaOrganizer: document.querySelector("#metaOrganizer"),
  metaPrice: document.querySelector("#metaPrice"),
  metaStatus: document.querySelector("#metaStatus"),
  detailDescription: document.querySelector("#detailDescription"),
  detailCategories: document.querySelector("#detailCategories"),
  detailLinks: document.querySelector("#detailLinks"),
  occurrenceList: document.querySelector("#occurrenceList")
};


function formatDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

async function restFetch(baseUrl, apiKey, path, params = {}) {
  const query = new URLSearchParams(params);
  const res = await fetch(`${baseUrl}/rest/v1/${path}?${query.toString()}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json();
}

function renderCategories(categories) {
  el.detailCategories.innerHTML = "";
  for (const cat of categories) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = cat.label || cat.slug;
    el.detailCategories.appendChild(chip);
  }
}

function renderLinks(eventRow) {
  el.detailLinks.innerHTML = "";
  if (eventRow.event_url) {
    const a = document.createElement("a");
    a.href = eventRow.event_url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "Eventseite";
    el.detailLinks.appendChild(a);
  }
  if (eventRow.ticket_url) {
    const a = document.createElement("a");
    a.href = eventRow.ticket_url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = "Tickets";
    el.detailLinks.appendChild(a);
  }
}

function renderOccurrences(occurrences) {
  el.occurrenceList.innerHTML = "";

  if (!occurrences.length) {
    el.occurrenceList.innerHTML = '<p class="muted">Keine Termine gefunden.</p>';
    return;
  }

  occurrences.forEach((occ, idx) => {
    const item = document.createElement("article");
    item.className = "occurrence-item";

    const line1 = document.createElement("p");
    line1.className = "occurrence-date";
    line1.textContent = `${formatDate(occ.starts_at)} Uhr`;

    const line2 = document.createElement("p");
    line2.className = "muted";
    line2.textContent = `Status: ${occ.occurrence_status}${occ.ends_at ? ` • Ende: ${formatDate(occ.ends_at)} Uhr` : ""}`;

    const line3 = document.createElement("p");
    line3.className = "muted";
    line3.textContent = `Termin ${idx + 1} von ${occurrences.length}`;

    item.appendChild(line1);
    item.appendChild(line2);
    item.appendChild(line3);
    el.occurrenceList.appendChild(item);
  });
}

async function loadDetail() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId");

  if (!eventId) {
    el.detailStatus.textContent = "Keine eventId in der URL. Bitte aus dem Feed oeffnen.";
    return;
  }

  try {
    const [eventRows, occurrences, eventCats] = await Promise.all([
      restFetch(SUPABASE_URL, SUPABASE_KEY, "events", {
        select: "id,title,subtitle,description,cover_image_url,event_url,ticket_url,is_free,min_price_cents,max_price_cents,currency_code,status,organizer_id,venue_id",
        id: `eq.${eventId}`,
        limit: "1"
      }),
      restFetch(SUPABASE_URL, SUPABASE_KEY, "event_occurrences", {
        select: "id,starts_at,ends_at,occurrence_status",
        event_id: `eq.${eventId}`,
        order: "starts_at.asc"
      }),
      restFetch(SUPABASE_URL, SUPABASE_KEY, "event_categories", {
        select: "category_id",
        event_id: `eq.${eventId}`
      })
    ]);

    if (!eventRows.length) {
      el.detailStatus.textContent = "Event nicht gefunden.";
      return;
    }

    const eventRow = eventRows[0];

    const [organizerRows, venueRows, categories] = await Promise.all([
      eventRow.organizer_id
        ? restFetch(SUPABASE_URL, SUPABASE_KEY, "organizers", {
            select: "name",
            id: `eq.${eventRow.organizer_id}`,
            limit: "1"
          })
        : Promise.resolve([]),
      eventRow.venue_id
        ? restFetch(SUPABASE_URL, SUPABASE_KEY, "venues", {
            select: "name,city,street,house_number,postal_code",
            id: `eq.${eventRow.venue_id}`,
            limit: "1"
          })
        : Promise.resolve([]),
      eventCats.length
        ? restFetch(SUPABASE_URL, SUPABASE_KEY, "categories", {
            select: "id,slug,label",
            id: `in.(${eventCats.map((x) => x.category_id).join(",")})`
          })
        : Promise.resolve([])
    ]);

    const organizer = organizerRows[0];
    const venue = venueRows[0];

    el.detailTitle.textContent = eventRow.title;
    el.detailSubtitle.textContent = eventRow.subtitle || "";
    el.metaOrganizer.textContent = organizer?.name || "-";
    el.metaVenue.textContent = venue
      ? `${venue.name}${venue.city ? `, ${venue.city}` : ""}`
      : "-";
    el.metaPrice.textContent = formatPrice(eventRow);
    el.metaStatus.textContent = eventRow.status;
    el.detailDescription.textContent = eventRow.description || "Keine Beschreibung.";

    if (eventRow.cover_image_url) {
      const img = document.createElement("img");
      img.src = eventRow.cover_image_url;
      img.alt = eventRow.title;
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      document.querySelector("#detailImage").appendChild(img);
    }

    renderCategories(categories);
    renderLinks(eventRow);
    renderOccurrences(occurrences);

    el.detailStatusPanel.hidden = true;
    el.detailMetaPanel.hidden = false;
    el.detailOccurrencesPanel.hidden = false;
  } catch (err) {
    el.detailStatus.textContent = `Fehler beim Laden: ${err.message}`;
  }
}

loadDetail();

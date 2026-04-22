# Event Atlas Prototype

## Start

1. In den Ordner wechseln:
   ```bash
   cd /Users/yona/Desktop/EventAtlas/prototype
   ```
2. Lokalen Webserver starten:
   ```bash
   python3 -m http.server 4173
   ```
3. Im Browser oeffnen:
   `http://localhost:4173`

## In der UI eintragen

- `Supabase URL`: Projekt-URL (z. B. `https://<ref>.supabase.co`)
- `Publishable Key`: `sb_publishable_...`

Dann auf `Speichern` und `Feed laden` klicken.

## Detailseite

- In jeder Event-Karte gibt es den Link `Details`.
- Diese Seite laedt Event-Stammdaten + alle Termine (`event_occurrences`) + Kategorien.

## Erwartung mit Seed-Daten

- Im Feed erscheinen mehrere Karten, inkl. wiederkehrender Reihe `Offener Leseclub`.
- Auf der Detailseite siehst du die Terminliste chronologisch.

## Datenquellen

- Feed: `public.upcoming_event_cards`
- Detail: `events`, `event_occurrences`, `organizers`, `venues`, `event_categories`, `categories`

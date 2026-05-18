# Event Atlas Prototype

## Start

Lokalen Webserver starten:
   ```bash
   python3 -m http.server 4173
   ```
Im Browser oeffnen:
   `http://localhost:4173`

## gh pushen
git remote add public https://github.com/yona-h/EventAtlas-prototype.git

git subtree push --prefix prototype public main

## Detailseite

- In jeder Event-Karte gibt es den Link `Details`.
- Diese Seite laedt Event-Stammdaten + alle Termine (`event_occurrences`) + Kategorien.

## Erwartung mit Seed-Daten

- Im Feed erscheinen mehrere Karten, inkl. wiederkehrender Reihe `Offener Leseclub`.
- Auf der Detailseite siehst du die Terminliste chronologisch.

## Datenquellen

- Feed: `public.upcoming_event_cards`
- Detail: `events`, `event_occurrences`, `organizers`, `venues`, `event_categories`, `categories`

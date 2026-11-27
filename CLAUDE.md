# Eat the Frog – Hinweise für Claude

Web-App (eine Datei: `index.html`) für Visio Coaching. Live: https://eatthefrog.web.app (Firebase-Projekt `eat-the-frog-26dd1`).
Patrik will nur die Online-Version (keine exe, keine HTML-Datei, keine Speicherkarte).

## «mein Feedback ist fertig»
Schreibt Patrik das (oder fragt nach Feedback), hat jemand mit **F2** Notizen in der App abgelegt
(Firestore-Sammlung `feedback`, lesen kann sie in der App niemand).

1. Abholen: `node tools/feedback.js` (mit angemeldeter Firebase-CLI; `NODE_PATH` auf die firebase-tools-Installation).
   Legt pro Sitzung einen Ordner an: `/Users/patrikkadar/Downloads/Alpen-Tagesplan/feedback/<Sitzung>_<Name>/`
   mit `NN_bild.jpg`, `NN_bemalt.jpg` (mit Kringeln) und `BERICHT.md` (Notizen, Zustand der App, Fehlermeldungen).
2. Den neuesten Ordner lesen und **jeden Punkt abarbeiten**: bemaltes Bild ansehen, Fehler beheben, wenn möglich testen.
3. Danach hochladen (siehe unten) und Patrik in einfachen Worten sagen, was geändert wurde.

## Hochladen
- Repo committen/pushen und `firebase deploy --only hosting --project eat-the-frog-26dd1`.
- `sw.js`: `CACHE` bei jedem Hochladen eine Nummer höher.
- Regeln (`firestore.rules`) nur mit Patriks ausdrücklichem OK deployen (`--only firestore:rules`).

## Testen ohne echte Konten
Lokal servieren und `http://localhost:<port>/?fbmock` öffnen: dann lädt die App den Firebase-Nachbau aus `tools/fbmock/`
(Daten in localStorage `fbmock`; Feedback landet in `window.__fbmockFeedback`). Demo-Daten: `node tools/demo.js json`.

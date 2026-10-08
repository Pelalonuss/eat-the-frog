# 🐸 Eat the Frog

Tagesplanung mit System: **ALPEN-Methode**, **80/20 (Pareto)**, **Eisenhower-Matrix** und **Eat the Frog**, mit Fredi dem Frosch als Begleiter.

## 🌐 Hier geht's los

**https://eatthefrog.web.app**

- Konto erstellen oder anmelden, fertig. Es braucht nichts zu installieren.
- Deine Pläne sind in deinem Konto gespeichert (Server in **Zürich**) und an jedem Computer da.
- Sehen können sie nur **du** und **deine Trainerin**.
- Tipp: In Chrome oder Edge oben rechts auf **«📲 App»** klicken, dann gibt es ein Fredi-Symbol auf dem Desktop (öffnet einfach die Website).

## Aufbau

- `index.html`: die ganze App (eine Datei)
- Login und Speicher: Firebase (Authentication + Firestore, Standort europe-west6 Zürich)
- `desktop/`: alte Windows-Version (wird nicht mehr verwendet)
- `docs/`: leitet die alte Adresse (pelalonuss.github.io/eat-the-frog) auf die neue um
- Hochladen: `firebase deploy --only hosting` (Firebase Hosting, Site «eatthefrog»)

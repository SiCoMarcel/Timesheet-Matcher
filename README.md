# Timesheet Konsolidierung

Automatische Konsolidierung von Timesheets aus verschiedenen Dateiformaten (PDF, Excel, CSV, Word) mit monatlicher Projektverwaltung.

## 🎯 Features

- **Multi-Format Support**: PDF, Excel (.xlsx/.xls), CSV, Word (.docx/.doc)
- **Intelligente Daten-Extraktion**: Automatische Erkennung von Spalten/Feldern
- **Monatsprojekte**: Speichern und nachträgliches Hinzufügen von Timesheets
- **Konsolidierung**: Automatische Gruppierung nach Beraternamen und Datum
- **Excel Export**: Professionell formatierte Ausgabe
- **Silicium CI Design**: Modernes UI basierend auf Silicium Consulting Corporate Identity

## 📋 Voraussetzungen

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.10+ ([Download](https://www.python.org/downloads/))

## 🚀 Installation

### 1. Repository klonen oder herunterladen
```bash
cd /Users/marcelkosel/Desktop/Timesheets
```

### 2. Frontend Dependencies installieren
```bash
npm install
```

### 3. Backend Dependencies installieren
```bash
cd backend
pip install -e .
cd ..
```

## 💻 Anwendung starten

Der folgende Befehl startet sowohl Frontend als auch Backend gleichzeitig:

```bash
npm run dev
```

Die Anwendung ist dann verfügbar unter:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📖 Nutzung

### 1. Projekt erstellen
- Klicken Sie auf "Neues Projekt"
- Geben Sie Monat (1-12) und Jahr ein
- Das Projekt wird mit dem Namen "Konsolidierte Stunden (Monat) Jahr" erstellt

### 2. Dateien hochladen
- Wählen Sie ein Projekt aus der Liste
- Ziehen Sie Dateien in den Upload-Bereich oder klicken Sie zum Auswählen
- Unterstützte Formate: PDF, Excel, CSV, Word
- Die Dateien werden automatisch geparst

### 3. Daten validieren & bearbeiten
- Überprüfen Sie die extrahierten Einträge in der Tabelle
- Bearbeiten Sie Felder bei Bedarf (Klick auf Stift-Symbol)
- Löschen Sie fehlerhafte Einträge

### 4. Speichern & Exportieren
- Klicken Sie auf "Speichern" um Änderungen in der Datenbank zu sichern
- Klicken Sie auf "Excel exportieren" für die konsolidierte Ausgabe
- Die Excel-Datei wird automatisch heruntergeladen

## 📁 Projektstruktur

```
Timesheets/
├── src/                    # Frontend (Next.js)
│   ├── app/               # Pages & Layouts
│   ├── components/        # React Komponenten
│   └── lib/              # Utilities & API Client
├── backend/               # Backend (FastAPI)
│   ├── parsers/          # File Parser (PDF, Excel, Word)
│   ├── routers/          # API Endpoints
│   ├── services/         # Business Logic
│   ├── database.py       # SQLite Setup
│   ├── schemas.py        # Pydantic Models
│   └── main.py           # FastAPI App
├── package.json
└── README.md
```

## 🔧 Datenmodell

### Wichtige Felder
- **Beratername**: Name des Consultants
- **Prozessstream**: z.B. "Plan to Deliver", "Procure to Pay"
- **Datum**: Datum der Leistungserbringung
- **Stunden**: Anzahl der Arbeitsstunden
- **Leistungsnachweis**: Freitextbeschreibung der erbrachten Leistung

## 🎨 Anpassung

### Prozessstreams hinzufügen
Bearbeiten Sie die Datei `backend/parsers/base_parser.py` und fügen Sie Keywords zu `PROCESS_KEYWORDS` hinzu.

### Farben ändern
Bearbeiten Sie `tailwind.config.ts` für die Farbpalette.

## 🐛 Troubleshooting

### Backend startet nicht
```bash
cd backend
pip install -e . --force-reinstall
```

### Frontend Build Fehler
```bash
rm -rf node_modules .next
npm install
```

### Ports bereits belegt
- Frontend Port ändern: Bearbeiten Sie `package.json` → Script: `next dev -p 3001`
- Backend Port ändern: Bearbeiten Sie `package.json` → Script: `uvicorn main:app --port 8001`

## 📄 Lizenz

© 2026 Silicium Consulting - Internes Tool

## 🤝 Support

Bei Fragen oder Problemen wenden Sie sich an das Entwicklungsteam.

# Org'atelier

Prototype full-stack pour gérer les présences, le pointage et les outils empruntés dans un atelier.

## Fonctionnalités

- **Planning des présences** : Indiquer les jours de présence dans un calendrier mensuel
- **Pointage** : Marquer les jours où vous étiez présent
- **Export CSV** : Exporter le pointage mensuel avec le nombre de jours
- **Outils empruntés** : Suivre les outils empruntés par l'équipe

## Technologies

- **Frontend** : React 18 + TypeScript + TailwindCSS + Vite
- **Backend** : Express.js + TypeScript
- **Base de données** : SQLite (fichier local)

## Installation

### Prérequis
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies for all workspaces
npm install

# This installs both frontend and backend dependencies
```

### Lancement en local

```bash
# Start both frontend (port 3000) and backend (port 3001) in dev mode
npm run dev

# Or run them separately:
# Terminal 1 - Backend
npm run dev --workspace=backend

# Terminal 2 - Frontend
npm run dev --workspace=frontend
```

### Compilation pour la production

```bash
npm run build
npm start
```

## File Structure

```
ResidentOrgApp/
├── frontend/                 # React app (Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # User context
│   │   ├── api.ts           # API client
│   │   └── App.tsx          # Main app
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Express server
│   ├── src/
│   │   ├── db.ts            # SQLite setup
│   │   ├── routes.ts        # API routes
│   │   └── index.ts         # Express server
│   ├── package.json
│   └── tsconfig.json
├── shared/
│   └── types.ts             # Shared TypeScript types
└── package.json             # Monorepo root
```

## Points d'accès API

### Utilisateurs
- `GET /api/users` - Récupérer tous les utilisateurs
- `POST /api/users` - Créer un utilisateur

### Présences (planning)
- `GET /api/presence` - Récupérer les présences
- `POST /api/presence` - Ajouter une présence
- `DELETE /api/presence/:id` - Supprimer une présence

### Pointage
- `GET /api/attendance` - Récupérer le pointage
- `POST /api/attendance` - Enregistrer un pointage
- `GET /api/attendance/export/:month` - Exporter un CSV

### Outils
- `GET /api/tools` - Récupérer tous les outils
- `POST /api/tools` - Ajouter un outil
- `DELETE /api/tools/:id` - Supprimer un outil

### Emprunts d'outils
- `GET /api/tool-borrows` - Récupérer les emprunts en cours
- `POST /api/tool-borrows` - Emprunter un outil
- `PUT /api/tool-borrows/:id/return` - Restituer un outil

## Notes

- La sélection de l'utilisateur est conservée dans le localStorage du navigateur
- Aucune authentification n'est requise
- La base SQLite est stockée dans `backend/app.db`


Consommables mail benj mail hebdo stocks
Export CSV --> mail benj 
Export calendrier 
Boite a idée pour les prochaines réunions 
Résmué hebdo benj ?
Dates de réunions sur calendrier ?
Gestion dechets ? 

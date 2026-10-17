# Org'atelier

Prototype full-stack pour gérer les présences, le pointage et les outils empruntés dans un atelier.

## Fonctionnalités

- **Planning des espaces** : Réserver les espaces bois et métal par demi-journée, avec trois personnes maximum par espace
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

### Configuration des courriels

Copiez `.env.example` vers `.env`, puis renseignez les paramètres SMTP du fournisseur de courriel. Le fichier `.env` est ignoré par Git.

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` configurent l'envoi des courriels.
- `APP_BASE_URL` définit le domaine utilisé dans le lien de configuration du mot de passe.
- `FRONTEND_ORIGIN` définit l'origine autorisée pour les requêtes avec session.

Dans Render, ajoutez ces mêmes valeurs dans les variables d'environnement du service. Lors de la création d'un compte, l'admin ne choisit pas le mot de passe : un mot de passe temporaire et un lien à usage unique valable 24 heures sont envoyés par courriel.

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

## Comptes de démonstration

Les comptes de test sont créés au premier démarrage :

| Type | Courriel | Mot de passe |
| --- | --- | --- |
| Admin | `admin@orgatelier.test` | `Admin123!` |
| Artisan | `artisan@orgatelier.test` | `Artisan123!` |
| Institut | `institut@orgatelier.test` | `Institut123!` |

Les mots de passe sont hachés avec scrypt. Les sessions utilisent un cookie HttpOnly. Un seul compte admin existe; l’admin crée les comptes artisan et institut depuis l’onglet Comptes. Un compte ne peut pas être créé ou promu admin.

## Points d'accès API

### Authentification et comptes
- `POST /api/auth/login` - Ouvrir une session
- `GET /api/auth/me` - Récupérer le compte connecté
- `POST /api/auth/logout` - Fermer la session
- `POST /api/auth/set-password` - Définir un nouveau mot de passe avec le lien reçu par courriel
- `PATCH /api/auth/profile` - Modifier la photo de profil
- `GET /api/admin/users` - Lister les comptes (admin)
- `POST /api/admin/users` - Créer un compte et envoyer son courriel de configuration (admin)
- `PATCH /api/admin/users/:id` - Modifier un compte (admin)
- `DELETE /api/admin/users/:id` - Supprimer un compte (admin)

### Planning des espaces
- `GET /api/planning?month=YYYY-MM` - Récupérer les jours et les inscriptions du mois
- `POST /api/planning/registrations` - Réserver un espace par demi-journée (institut/admin peuvent préciser le nombre de personnes)
- `PUT /api/planning/registrations/:id` - Modifier son commentaire
- `DELETE /api/planning/registrations/:id` - Se désinscrire

Chaque espace (bois ou métal) accueille au maximum trois personnes par demi-journée, en comptant les groupes.

### Pointage
- `GET /api/attendance` - Récupérer le pointage
- `POST /api/attendance` - Enregistrer un pointage
- `GET /api/attendance/export/:month` - Exporter un CSV
- `GET /api/admin/attendance?month=YYYY-MM` - Résumé des jours complets de tous les artisans (admin)
- `GET /api/admin/attendance/export/:month` - Export CSV du nom complet et du nombre de jours (admin)

Pour le résumé admin, chaque date pointée comme présente compte comme un jour complet.
- `GET /api/admin/attendance?month=YYYY-MM` - Sommaire mensuel de tous les artisans pour l'admin
- `GET /api/admin/attendance/export/:month` - Exporter les noms et jours complets des artisans (admin)

Un jour pointé comme présent compte comme un jour complet dans le sommaire admin.

### Outils
- `GET /api/tools` - Récupérer tous les outils
- `POST /api/tools` - Ajouter un outil
- `DELETE /api/tools/:id` - Supprimer un outil

### Emprunts d'outils
- `GET /api/tool-borrows` - Récupérer les emprunts en cours
- `POST /api/tool-borrows` - Emprunter un outil
- `PUT /api/tool-borrows/:id/return` - Restituer un outil

## Notes

- Les autorisations sont contrôlées par rôle dans l'API : admin, artisan et institut
- Les mots de passe ne sont jamais stockés en clair
- Les anciennes données de présence sont supprimées au démarrage; le planning utilise désormais les inscriptions par jour, demi-journée et espace
- La première initialisation du nouveau schéma POC recrée la base et supprime les anciennes données de démonstration
- La base SQLite est stockée dans `backend/app.db`

Compte : options (supprimer le compte, ajouter un jour au planning -> s'ajoute a pointage, petite page résumé avec nmbre de jours (et prix), matos emprunté, ...)
Consommables mail benj mail hebdo stocks
Export CSV --> mail benj 
Export calendrier 
Boite a idée pour les prochaines réunions 
Résmué hebdo benj ?
Dates de réunions sur calendrier ?
Gestion dechets ? 

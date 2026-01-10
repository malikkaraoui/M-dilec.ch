# Médilec.ch — Front (Vite + React) + Firebase (Auth/RTDB/Storage)

MVP e-commerce “demande de devis” : catalogue, panier, création de demandes, back-office admin.

## Prérequis

- Node.js (LTS recommandé)
- Un projet Firebase (Auth + Realtime Database + Storage)

## Démarrage local

1) Installer les dépendances.

2) Créer un fichier `.env.local` (non committé) à partir de `.env.example` et renseigner :

- `VITE_FIREBASE_*`

3) Lancer le dev server.

## Publisher catalogue (localhost)

Le back-office admin peut publier directement dans `public/catalog/` via un service local (FastAPI) exposé derrière le proxy Vite sur `/api`.

### Setup “propre-propre” (recommandé)

1) Dans `.env.local` (front Vite), définir un token :

- `VITE_ADMIN_TOKEN=...`

2) Démarrer le publisher avec **le même token** côté serveur :

- `ADMIN_TOKEN=...` (même valeur que `VITE_ADMIN_TOKEN`)

> Important: après modification de `.env.local`, redémarrer Vite (les variables Vite sont injectées au build/dev-server).

### Démarrage en 1 commande

Depuis la racine du repo :

- `npm run dev:full`

Cela démarre :

- Vite sur `http://localhost:5173`
- le publisher sur `http://127.0.0.1:8787` (et Vite proxy `/api` vers ce port)

Le script lit `.env.local` et injecte automatiquement `ADMIN_TOKEN` à partir de `VITE_ADMIN_TOKEN`.

### Runbook

Voir `docs/RUNBOOK_PUBLISH_LOCALHOST.md` (checklist 2 minutes + troubleshooting).

### Vérification rapide

- `GET /api/catalog/ping` doit répondre `{ "ok": true }`.
- Quand vous publiez depuis l’admin, un panneau affiche le statut/progrès du job et confirme la fin de publication.

## Admin (compte fixe + tous les droits)

Le modèle final est volontairement simple :

- l’admin se connecte comme un utilisateur via **email/mot de passe**
- les droits sont accordés via **custom claim** : `role="admin"`

### 1) Créer l’utilisateur `admin@medilec.ch`

Dans Firebase Console > Authentication :

- Créer l’utilisateur `admin@medilec.ch`
- Définir un mot de passe

### 2) Assigner le rôle `admin`

Il faut poser le custom claim via Admin SDK (une seule fois).

Prérequis:

- Télécharger un **Service Account JSON** depuis Firebase Console > Project settings > Service accounts
- Exporter `GOOGLE_APPLICATION_CREDENTIALS` vers ce fichier (local)

Le dépôt fournit un script :

- `scripts/set-admin-role.mjs`

La commande npm existe aussi :

- `npm run admin:bootstrap`

> Note: après modification des claims, l’utilisateur doit se reconnecter (ou forcer refresh token) pour recevoir le nouveau rôle.

## Import du catalogue vers RTDB (/products)

Pour alimenter la base produits Firebase à partir de l’export sous `public/catalog/`, le dépôt fournit un script d’import.

Prérequis (local):

- `GOOGLE_APPLICATION_CREDENTIALS` vers un Service Account JSON
- `VITE_FIREBASE_DATABASE_URL` (ou `FIREBASE_DATABASE_URL`)

Commandes:

- `npm run admin:import-catalog -- --dry-run` (aperçu)
- `npm run admin:import-catalog` (ajoute uniquement les produits manquants)
- `npm run admin:import-catalog -- --overwrite` (met à jour/écrase aussi l’existant)

## Règles sécurité

- RTDB: écriture admin uniquement sur `/products`, lecture publique des produits, commandes privées, admin modifie statuts/notes.
- Storage: PDFs produits en lecture publique, écriture admin uniquement, PDF-only.

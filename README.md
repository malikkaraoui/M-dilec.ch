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

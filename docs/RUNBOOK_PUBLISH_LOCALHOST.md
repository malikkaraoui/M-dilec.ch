# Runbook — Publication catalogue en localhost (2 minutes)

## Objectif

Lancer **le front Vite** + **le publisher local** (FastAPI) et publier un produit depuis l’admin, avec un retour **status/progrès/logs**.

## Pré-requis (une seule fois)

- Node.js (LTS recommandé)
- Python 3.10+ (idéalement avec un venv `.venv/` à la racine)

Installer les dépendances Python du publisher :
- `publisher/requirements.txt`

> Note: si `.venv/` n’existe pas, crée-le puis installe les requirements dedans.

## Setup “propre-propre” des tokens

1) Dans `.env.local` (à la racine, non committé), définir :

- `VITE_ADMIN_TOKEN=un-token-long-et-unique`

2) Le publisher doit démarrer avec **le même token** côté serveur, via :

- `ADMIN_TOKEN = VITE_ADMIN_TOKEN`

Avec `dev:full`, ce mapping est fait automatiquement (le script lit `.env.local`).

## Démarrage (recommandé)

Depuis la racine du repo :

- `npm run dev:full`

Ce que ça fait :
- démarre le publisher sur `http://127.0.0.1:8787`
- démarre Vite sur `http://localhost:5173`
- Vite proxy `/api/*` → `127.0.0.1:8787`

## Checks rapides

1) Vérifier que le publisher répond (via Vite proxy) :

- `GET http://localhost:5173/api/catalog/ping` → `{ "ok": true }`

2) Dans l’admin :

- aller sur `http://localhost:5173/admin/products/new`
- remplir le produit
- cliquer **Publier**

Résultat attendu :
- un panneau “Publication en cours…” affiche **status + % + logs**
- puis un bandeau “Publication terminée” + bouton “Voir le produit”

## Troubleshooting

### 401 Unauthorized au publish
- Le token côté front et côté publisher ne matchent pas.
- Vérifier `VITE_ADMIN_TOKEN` dans `.env.local`, puis redémarrer Vite.
- Vérifier que le publisher a bien `ADMIN_TOKEN` (avec `dev:full`, c’est auto).

### /api/catalog/* en 404 ou NetworkError
- Le publisher n’est pas démarré (ou pas sur le port 8787).
- Lancer `npm run dev:full`.

### Le produit est publié mais la page /p/* reste en “Chargement…”
- Problème de cache navigateur / fetch.
- Utiliser le bouton “Voir le produit” (il ajoute un `?v=` cache-bust) ou rafraîchir.

### Erreur “uvicorn introuvable”
- Les dépendances Python ne sont pas installées dans l’environnement utilisé.
- Installer `publisher/requirements.txt` dans `.venv`.

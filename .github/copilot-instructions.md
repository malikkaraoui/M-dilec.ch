# Instructions GitHub Copilot — Médilec.ch

Ce fichier existe pour que Copilot capte immédiatement les règles du dépôt.

## Référence
- Les instructions détaillées et canoniques sont dans `instruction_copilot.md` (racine).

## Hygiène Git
- Ne jamais commiter: `.env*`, `functions/.env*` (sauf `.env.example`).

## Structure
- Conserver l’organisation `src/app`, `src/features`, `src/components`, `src/lib`.
- Préférer hooks + petits composants.
- Bonnes pratiques : pour les mappings discrets (type/statut/role), préférer `switch` + `default` plutôt que des chaînes de `if`/ternaires (détails dans `.github/instruction_copilot.md`).

# ADR 003 — Markdown + KaTeX pour le contenu des cartes

**Date** : 2024 (identifié via brownfield 2026-03-26)
**Statut** : Accepté

## Contexte

Les utilisateurs ont besoin de créer des cartes avec des formules mathématiques (physique, maths, chimie) et du formatage riche (listes, gras, code). Le HTML brut serait dangereux (XSS) et peu ergonomique.

## Décision

Contenu stocké en Markdown (`front_md`, `back_md`, `hint_md`). Rendu via `react-markdown` + `remark-math` + `rehype-katex`.

## Conséquences

- ✅ Sécurisé (pas de HTML brut)
- ✅ Support LaTeX complet pour les formules
- ✅ Portable (Markdown est lisible même sans rendu)
- ✅ Léger à synchroniser (texte pur)
- ⚠️ Les médias (images) sont stockés en Blob dans IndexedDB — pas inline dans le Markdown

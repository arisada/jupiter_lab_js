# Masse de Jupiter — Outil pédagogique

Outil interactif HTML pour calculer la masse de Jupiter à partir d'observations de ses lunes galiléennes (Io, Europe, Ganymède, Callisto) et de la 3ème loi de Kepler.

Conçu pour des ateliers d'astronomie en lycée (niveau Terminale).

## Fonctionnement

1. **Saisie des observations** — entrez chaque observation avec sa date/heure et la position des 4 lunes en unités joviennes (D.J.), directement sur le schéma graphique de Jupiter.
2. **Ajustement des orbites** — pour chaque lune, ajustez manuellement les paramètres de la sinusoïde (période T, phase t₀, amplitude A) pour maximiser le coefficient R².
3. **Calcul de la masse** — une régression sur la 3ème loi de Kepler (T² ∝ a³) donne la pente 4π²/(GM), d'où l'on tire la masse de Jupiter. Le détail du calcul est affiché étape par étape.

## Utilisation

Ouvrir `index.html` dans un navigateur — aucune installation requise, tout est contenu dans ce fichier unique.

## Crédits

Code généré par [Claude](https://claude.ai) (Anthropic).

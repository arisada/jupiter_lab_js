# Masse de Jupiter — Outil pédagogique

Outil interactif HTML pour calculer la masse de Jupiter à partir d'observations de ses lunes galiléennes (Io, Europe, Ganymède, Callisto) et de la 3ème loi de Kepler.

Conçu pour des ateliers d'astronomie pédagogiques.

**Démo en ligne :** https://arisada.github.io/jupiter_lab_js/

## Fonctionnement

1. **Saisie des observations** — entrez chaque observation avec sa date/heure et la position des 4 lunes en unités joviennes (D.J.), directement sur le schéma graphique de Jupiter.
2. **Ajustement des orbites** — pour chaque lune, ajustez manuellement les paramètres de la sinusoïde (période T, phase t₀, amplitude A) pour maximiser le coefficient R².
3. **Calcul de la masse** — une régression sur la 3ème loi de Kepler (T² ∝ a³) donne la pente 4π²/(GM), d'où l'on tire la masse de Jupiter. Le détail du calcul est affiché étape par étape.

## Utilisation

Ouvrir `index.html` dans un navigateur via un serveur web local, ou utiliser la démo en ligne ci-dessus.

## Références

### Lois de Kepler
- [Kepler's Laws — HyperPhysics (Georgia State University)](http://hyperphysics.phy-astr.gsu.edu/hbase/kepler.html) — dérivation quantitative avec formules.
- [Lois de Kepler — Wikipédia (fr)](https://fr.wikipedia.org/wiki/Lois_de_Kepler) — article de référence en français.
- [Kepler's Laws of Planetary Motion — Wikipedia (en)](https://en.wikipedia.org/wiki/Kepler%27s_laws_of_planetary_motion) — article détaillé avec dérivations.

### Mesure de la masse de Jupiter par ses satellites
- [Galilean Moons of Jupiter — University of Nebraska-Lincoln](https://astro.unl.edu/naap/pos/animations/kepler.html) — simulateur interactif des orbites des lunes galiléennes.
- [Satellites galiléens — Wikipédia (fr)](https://fr.wikipedia.org/wiki/Satellites_galil%C3%A9ens) — description des quatre lunes et de leurs orbites.

## Crédits

Projet de [Aris Adamantiadis](https://github.com/arisada) — code généré par [Claude](https://claude.ai) (Anthropic).

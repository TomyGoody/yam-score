# Générateur des tracés Grand Prix YamScore

Ce script télécharge les géométries exactes des circuits depuis le dépôt
`bacinger/f1-circuits`, puis crée 19 SVG homogènes :

- même `viewBox` : `0 0 1000 700`
- mêmes marges
- même épaisseur de trait
- fond transparent
- couleur YamScore propre à chaque circuit
- ombre sombre intégrée au SVG

## Utilisation

Place `generate-grand-prix-tracks.mjs` à la racine du projet YamScore puis lance :

```powershell
node .\generate-grand-prix-tracks.mjs
```

Les fichiers seront créés dans :

```text
public/grand-prix/tracks/
```

Tu peux aussi choisir un autre dossier :

```powershell
node .\generate-grand-prix-tracks.mjs .\mon-dossier
```

## Fichiers créés

```text
melbourne.svg
bahrain.svg
jeddah.svg
suzuka.svg
shanghai.svg
imola.svg
monaco.svg
barcelona.svg
montreal.svg
spielberg.svg
silverstone.svg
spa.svg
zandvoort.svg
monza.svg
singapore.svg
austin.svg
mexico.svg
interlagos.svg
abu_dhabi.svg
manifest.json
LICENSE-SOURCE.txt
```

Le composant actuel peut ensuite continuer à utiliser :

```tsx
<img
  src={`/grand-prix/tracks/${circuitId}.svg`}
  alt={`Tracé du circuit ${getCircuit(circuitId).shortName}`}
  className="h-full w-full object-contain"
/>
```

## Prérequis

Node.js 18 ou plus récent, afin de disposer de `fetch` nativement.

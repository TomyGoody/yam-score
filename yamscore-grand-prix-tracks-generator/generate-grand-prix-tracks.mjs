#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const OUTPUT_DIR = path.resolve(
  process.argv[2] ?? "public/grand-prix/tracks"
);

const SOURCE_BASE =
  "https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits";

const WIDTH = 1000;
const HEIGHT = 700;
const PADDING = 55;
const STROKE_WIDTH = 18;

const TRACKS = [
  { id: "melbourne", source: "au-1953.geojson", accent: "#55C2E8" },
  { id: "bahrain", source: "bh-2002.geojson", accent: "#E7B35A" },
  { id: "jeddah", source: "sa-2021.geojson", accent: "#48C78E" },
  { id: "suzuka", source: "jp-1962.geojson", accent: "#F05A67" },
  { id: "shanghai", source: "cn-2004.geojson", accent: "#F1C75B" },
  { id: "imola", source: "it-1953.geojson", accent: "#57C28B" },
  { id: "monaco", source: "mc-1929.geojson", accent: "#F04A54" },
  { id: "barcelona", source: "es-1991.geojson", accent: "#F4C64E" },
  { id: "montreal", source: "ca-1978.geojson", accent: "#F06464" },
  { id: "spielberg", source: "at-1969.geojson", accent: "#F15B64" },
  { id: "silverstone", source: "gb-1948.geojson", accent: "#6E96F2" },
  { id: "spa", source: "be-1925.geojson", accent: "#E3C64B" },
  { id: "zandvoort", source: "nl-1948.geojson", accent: "#F3934E" },
  { id: "monza", source: "it-1922.geojson", accent: "#58C58C" },
  { id: "singapore", source: "sg-2008.geojson", accent: "#BE78EE" },
  { id: "austin", source: "us-2012.geojson", accent: "#678DE9" },
  { id: "mexico", source: "mx-1962.geojson", accent: "#52BB83" },
  { id: "interlagos", source: "br-1940.geojson", accent: "#E2C84E" },
  { id: "abu_dhabi", source: "ae-2009.geojson", accent: "#58C5B8" },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractCoordinates(geojson) {
  const feature = geojson.features?.[0];

  if (!feature) {
    throw new Error("Aucune géométrie trouvée.");
  }

  const geometry = feature.geometry;

  if (geometry?.type === "LineString") {
    return {
      coordinates: geometry.coordinates,
      name: feature.properties?.Name ?? "Circuit",
      location: feature.properties?.Location ?? "",
    };
  }

  if (geometry?.type === "MultiLineString") {
    const longest = [...geometry.coordinates].sort(
      (a, b) => b.length - a.length
    )[0];

    return {
      coordinates: longest,
      name: feature.properties?.Name ?? "Circuit",
      location: feature.properties?.Location ?? "",
    };
  }

  throw new Error(
    `Type de géométrie non pris en charge : ${geometry?.type ?? "inconnu"}`
  );
}

function projectCoordinates(coordinates) {
  const meanLatitude =
    coordinates.reduce((sum, [, latitude]) => sum + latitude, 0) /
    coordinates.length;

  const longitudeScale = Math.cos((meanLatitude * Math.PI) / 180);

  const projected = coordinates.map(([longitude, latitude]) => [
    longitude * longitudeScale,
    -latitude,
  ]);

  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const contentWidth = Math.max(maxX - minX, Number.EPSILON);
  const contentHeight = Math.max(maxY - minY, Number.EPSILON);

  const scale = Math.min(
    (WIDTH - PADDING * 2) / contentWidth,
    (HEIGHT - PADDING * 2) / contentHeight
  );

  const renderedWidth = contentWidth * scale;
  const renderedHeight = contentHeight * scale;
  const offsetX = (WIDTH - renderedWidth) / 2;
  const offsetY = (HEIGHT - renderedHeight) / 2;

  return projected.map(([x, y]) => [
    offsetX + (x - minX) * scale,
    offsetY + (y - minY) * scale,
  ]);
}

function createPath(points) {
  return points
    .map(([x, y], index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildSvg({ pathData, accent, name, sourceUrl }) {
  const safeName = escapeXml(name);
  const safeSource = escapeXml(sourceUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${WIDTH} ${HEIGHT}"
  role="img"
  aria-labelledby="title description"
>
  <title id="title">${safeName}</title>
  <desc id="description">Tracé normalisé pour YamScore. Source géométrique : ${safeSource}</desc>

  <path
    d="${pathData}"
    fill="none"
    stroke="#000000"
    stroke-opacity="0.46"
    stroke-width="${STROKE_WIDTH + 14}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <path
    d="${pathData}"
    fill="none"
    stroke="${accent}"
    stroke-width="${STROKE_WIDTH}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
`;
}

async function downloadGeoJson(track) {
  const sourceUrl = `${SOURCE_BASE}/${track.source}`;
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "YamScore track generator",
      Accept: "application/geo+json,application/json,text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${track.id}: téléchargement impossible (${response.status}) — ${sourceUrl}`
    );
  }

  return {
    geojson: await response.json(),
    sourceUrl,
  };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const manifest = [];

  for (const track of TRACKS) {
    process.stdout.write(`Génération de ${track.id}.svg... `);

    const { geojson, sourceUrl } = await downloadGeoJson(track);
    const { coordinates, name, location } = extractCoordinates(geojson);
    const points = projectCoordinates(coordinates);
    const pathData = createPath(points);
    const svg = buildSvg({
      pathData,
      accent: track.accent,
      name,
      sourceUrl,
    });

    const outputPath = path.join(OUTPUT_DIR, `${track.id}.svg`);
    await fs.writeFile(outputPath, svg, "utf8");

    manifest.push({
      id: track.id,
      file: `${track.id}.svg`,
      source: track.source,
      sourceUrl,
      name,
      location,
      accent: track.accent,
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    });

    console.log("OK");
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  await fs.writeFile(
    path.join(OUTPUT_DIR, "LICENSE-SOURCE.txt"),
    [
      "Track geometry source:",
      "bacinger/f1-circuits",
      "https://github.com/bacinger/f1-circuits",
      "",
      "License: MIT",
      "Copyright (c) 2019-2025 Tomislav Bacinger",
      "",
      "The SVG presentation and normalization were generated for YamScore.",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(`\n19 tracés créés dans : ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error("\nErreur :", error);
  process.exitCode = 1;
});

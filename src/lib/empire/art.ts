import seedJson from "./seed.json";
import type { CrewId, EmpireSeed, TerritoryId } from "./types";

const seed = seedJson as EmpireSeed;

export const DRIVE_PREFIX = "drive:";
export const HALL_MAP_ART = "/art/districts.jpg";

export type ArtSlot =
  | { kind: "crew"; id: CrewId; label: string; fallback: string }
  | { kind: "territory"; id: TerritoryId; label: string; fallback: string }
  | { kind: "map"; id: "map"; label: string; fallback: string };

export type HallStill = {
  id: string;
  src: string;
  label: string;
  group: "crew" | "place";
};

export type StashItem = {
  id: string;
  name: string;
  src: string;
};

export const HALL_LIBRARY: HallStill[] = [
  ...seed.crews.map((c) => ({
    id: `crew-${c.Name}`,
    src: c.Portrait,
    label: c.DisplayName,
    group: "crew" as const,
  })),
  ...seed.territories.map((t) => ({
    id: `place-${t.Name}`,
    src: t.Art,
    label: t.DisplayName,
    group: "place" as const,
  })),
  {
    id: "place-map",
    src: HALL_MAP_ART,
    label: "District map",
    group: "place",
  },
];

export function artSlots(): ArtSlot[] {
  return [
    ...seed.crews.map((c) => ({
      kind: "crew" as const,
      id: c.Name,
      label: c.DisplayName,
      fallback: c.Portrait,
    })),
    ...seed.territories.map((t) => ({
      kind: "territory" as const,
      id: t.Name,
      label: t.DisplayName,
      fallback: t.Art,
    })),
    { kind: "map", id: "map", label: "District map", fallback: HALL_MAP_ART },
  ];
}

export function isDriveSrc(src: string) {
  return src.startsWith(DRIVE_PREFIX);
}

export function driveFileId(src: string) {
  return src.slice(DRIVE_PREFIX.length);
}

export function driveArtSrc(fileId: string) {
  return `${DRIVE_PREFIX}${fileId}`;
}

export function driveCandidates(fileId: string): string[] {
  return [
    `https://lh3.googleusercontent.com/d/${fileId}=w1200`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
  ];
}

export function artCandidates(src: string, fallback: string): string[] {
  if (isDriveSrc(src)) {
    return [...driveCandidates(driveFileId(src)), fallback];
  }
  if (src && src !== fallback) return [src, fallback];
  return [src || fallback];
}

export function hallCrewArt(): Record<string, string> {
  return Object.fromEntries(seed.crews.map((c) => [c.Name, c.Portrait]));
}

export function hallTerritoryArt(): Record<string, string> {
  return Object.fromEntries(seed.territories.map((t) => [t.Name, t.Art]));
}

export async function fileToArtUrl(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1100;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return readFileAsDataUrl(file);
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return readFileAsDataUrl(file);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

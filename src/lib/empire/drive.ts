import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  classifyCallToolError,
  ConnectorType,
  GoogleDriveTools,
  type CallToolErrorState,
  type CallToolResult,
} from "@/lib/app-data";

export type DriveImage = {
  id: string;
  name: string;
  mime: string;
  bytes: number;
};

export type DriveListResult =
  | { status: "ok"; images: DriveImage[] }
  | { status: "error"; error: CallToolErrorState; loginUrl?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function parseImageList(data: unknown): DriveImage[] {
  const root = asRecord(data);
  const raw = Array.isArray(data)
    ? data
    : Array.isArray(root?.files)
      ? root.files
      : Array.isArray(root?.items)
        ? root.items
        : [];
  const out: DriveImage[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const mime = str(row.mime_type || row.mimeType || row.mime).toLowerCase();
    const name = str(row.name || row.title);
    const id = str(row.file_id || row.id || row.fileId);
    if (!id || !name) continue;
    if (row.is_folder === true) continue;
    if (mime.includes("folder") || mime.includes("directory")) continue;
    const isImage = mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(name);
    if (!isImage) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      mime: mime || "image/jpeg",
      bytes: num(row.size_bytes ?? row.size),
    });
  }
  return out;
}

function failFrom(result: CallToolResult): DriveListResult {
  return {
    status: "error",
    error: classifyCallToolError(result) ?? {
      kind: "error",
      message: result.errorMessage ?? "Something went wrong. Try again.",
    },
    loginUrl: result.loginUrl,
  };
}

function mergeImages(into: DriveImage[], extra: DriveImage[]) {
  const seen = new Set(into.map((img) => img.id));
  for (const img of extra) {
    if (seen.has(img.id)) continue;
    seen.add(img.id);
    into.push(img);
  }
}

export const listDriveImages = createServerFn({ method: "POST" })
  .validator(z.object({ query: z.string().max(80).optional() }))
  .handler(async ({ data }): Promise<DriveListResult> => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const opts = { connectorType: ConnectorType.GoogleDrive };
    const query = data.query?.trim() || undefined;

    const primary = await callTool(
      GoogleDriveTools.search,
      {
        mime_type_filter: "image/jpeg",
        max_results: 40,
        ...(query ? { query, title_only: true } : {}),
      },
      opts,
    );
    if (!primary.ok) return failFrom(primary);

    const images = parseImageList(primary.data);

    if (!query) {
      const photos = await callTool(
        GoogleDriveTools.search,
        {
          mime_type_filter: "image/jpeg",
          folder_name: "Photos",
          max_results: 40,
        },
        opts,
      );
      if (photos.ok) {
        mergeImages(images, parseImageList(photos.data));
      }
    }

    const png = await callTool(
      GoogleDriveTools.search,
      {
        mime_type_filter: "image/png",
        max_results: 20,
        ...(query ? { query, title_only: true } : {}),
      },
      opts,
    );
    if (png.ok) mergeImages(images, parseImageList(png.data));

    return { status: "ok", images: images.slice(0, 72) };
  });

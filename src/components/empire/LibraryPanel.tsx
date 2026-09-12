import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, ImageIcon, Upload, X } from "lucide-react";
import { ArtImage } from "@/components/empire/ArtImage";
import { Button } from "@/components/ui/button";
import {
  redirectToLoginIfRequired,
  useRefetchWhenConnectorReady,
  type CallToolResult,
} from "@/lib/app-data";
import {
  artSlots,
  driveArtSrc,
  fileToArtUrl,
  HALL_LIBRARY,
  type ArtSlot,
} from "@/lib/empire/art";
import { listDriveImages } from "@/lib/empire/drive";
import { playClick } from "@/lib/empire/audio";
import { useOverlayPresence } from "@/lib/empire/motion";
import { useEmpire } from "@/lib/empire/store";
import { cn } from "@/lib/utils";

type Tab = "hall" | "drive" | "drop";

function slotSrc(
  slot: ArtSlot,
  crews: ReturnType<typeof useEmpire.getState>["crews"],
  territories: ReturnType<typeof useEmpire.getState>["territories"],
  mapArt: string,
) {
  if (slot.kind === "crew") return crews[slot.id]?.Portrait ?? slot.fallback;
  if (slot.kind === "territory") return territories[slot.id]?.Art ?? slot.fallback;
  return mapArt || slot.fallback;
}

export function LibraryPanel() {
  const open = useEmpire((s) => s.libraryOpen);
  const openLibrary = useEmpire((s) => s.openLibrary);
  const crews = useEmpire((s) => s.crews);
  const territories = useEmpire((s) => s.territories);
  const mapArt = useEmpire((s) => s.mapArt);
  const stash = useEmpire((s) => s.stash);
  const setArt = useEmpire((s) => s.setArt);
  const stashDrop = useEmpire((s) => s.stashDrop);
  const restoreHallArt = useEmpire((s) => s.restoreHallArt);
  const { present, leaving } = useOverlayPresence(open);
  const [tab, setTab] = useState<Tab>("hall");
  const [slotId, setSlotId] = useState<string>("crew:Player");
  const [query, setQuery] = useState("");
  const [driveQuery, setDriveQuery] = useState("");
  const [dropping, setDropping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const slots = useMemo(() => artSlots(), []);
  const slot = slots.find((s) => keyOf(s) === slotId) ?? slots[0];

  const drive = useQuery({
    queryKey: ["empire-drive-images", driveQuery],
    queryFn: () => listDriveImages({ data: { query: driveQuery || undefined } }),
    enabled: open && tab === "drive",
    retry: false,
    refetchOnWindowFocus: false,
  });

  const driveWaiting = drive.data?.status === "error" && drive.data.error.kind === "pending";
  const waitStatus = useRefetchWhenConnectorReady(
    Boolean(open && tab === "drive" && driveWaiting),
    drive.refetch,
  );

  if (!present || !slot) return null;

  const current = slotSrc(slot, crews, territories, mapArt);

  function assign(src: string) {
    playClick();
    setArt(slot, src);
  }

  async function onFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setDropping(true);
    try {
      let first = true;
      for (const file of list.slice(0, 8)) {
        const src = await fileToArtUrl(file);
        if (!src) continue;
        stashDrop({ id: `drop-${Date.now()}-${file.name}`, name: file.name, src });
        if (first) {
          assign(src);
          first = false;
        }
      }
    } finally {
      setDropping(false);
    }
  }

  const driveError = drive.data?.status === "error" ? drive.data : null;
  const driveImages = drive.data?.status === "ok" ? drive.data.images : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className={cn("absolute inset-0 bg-bg/60", leaving ? "anim-veil-out" : "anim-veil")}
        aria-hidden
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-lg flex-col bg-surface shadow-border",
          leaving ? "anim-sheet-out" : "anim-sheet",
        )}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs tracking-[0.22em] text-muted uppercase">Still library</p>
            <h2 className="font-display text-xl">Hall / Drive</h2>
          </div>
          <Button variant="ghost" className="size-11 p-0" onClick={() => openLibrary(false)} aria-label="Close library">
            <X className="size-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-8">
          <section className="space-y-3">
            <p className="text-xs tracking-[0.22em] text-muted uppercase">Assign to</p>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {slots.map((s) => {
                const src = slotSrc(s, crews, territories, mapArt);
                const on = keyOf(s) === slotId;
                return (
                  <li key={keyOf(s)} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setSlotId(keyOf(s));
                      }}
                      className={cn(
                        "w-20 rounded-lg bg-elevated p-1 text-left shadow-border",
                        on && "shadow-border-hover",
                      )}
                    >
                      <ArtImage
                        src={src}
                        fallback={s.fallback}
                        alt=""
                        className="aspect-2/3 w-full rounded-md outline outline-1 -outline-offset-1 outline-white/10"
                      />
                      <p className="mt-1 truncate px-0.5 text-xs text-muted">{s.label}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-muted">
              Painting <span className="text-fg">{slot.label}</span>. Hall stills always work. Drive photos load if
              Google will show them in this window — otherwise drop the file.
            </p>
          </section>

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-elevated p-1 shadow-border">
            <TabBtn id="hall" tab={tab} setTab={setTab} icon={<ImageIcon className="size-4" />} label="Hall" />
            <TabBtn id="drive" tab={tab} setTab={setTab} icon={<HardDrive className="size-4" />} label="Drive" />
            <TabBtn id="drop" tab={tab} setTab={setTab} icon={<Upload className="size-4" />} label="Drop" />
          </div>

          {tab === "hall" ? (
            <ul className="grid grid-cols-3 gap-2">
              {HALL_LIBRARY.map((still) => (
                <li key={still.id}>
                  <button
                    type="button"
                    onClick={() => assign(still.src)}
                    className={cn(
                      "w-full rounded-lg bg-elevated p-1 text-left shadow-border",
                      current === still.src && "shadow-border-hover",
                    )}
                  >
                    <ArtImage
                      src={still.src}
                      fallback={still.src}
                      alt=""
                      className="aspect-2/3 w-full rounded-md outline outline-1 -outline-offset-1 outline-white/10"
                    />
                    <p className="mt-1 truncate px-0.5 text-xs text-muted">{still.label}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {tab === "drive" ? (
            <div className="space-y-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setDriveQuery(query.trim());
                }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Drive"
                  className="min-h-11 min-w-0 flex-1 rounded-md bg-elevated px-3 text-sm text-fg shadow-border outline-none placeholder:text-subtle"
                />
                <Button type="submit" variant="secondary" className="min-h-11">
                  Search
                </Button>
              </form>
              {waitStatus === "not_embedded" ? (
                <p className="text-sm text-muted">
                  Open this Hall from Grok to list Drive photos. Hall stills and dropped files still work here.
                </p>
              ) : waitStatus === "timed_out" ? (
                <DriveStatus
                  kind="error"
                  message="Drive is taking too long. Try again, or use Hall stills."
                  onLogin={() => undefined}
                  onRetry={() => void drive.refetch()}
                />
              ) : drive.isLoading || waitStatus === "waiting" || driveWaiting ? (
                <p className="text-sm text-muted">Connecting to your Drive…</p>
              ) : driveError ? (
                <DriveStatus
                  kind={driveError.error.kind}
                  message={driveError.error.message}
                  loginUrl={driveError.loginUrl}
                  onLogin={() =>
                    redirectToLoginIfRequired({
                      ok: false,
                      data: null,
                      loginRequired: true,
                      loginUrl: driveError.loginUrl,
                    } satisfies CallToolResult)
                  }
                  onRetry={() => void drive.refetch()}
                />
              ) : driveImages.length === 0 ? (
                <p className="text-sm text-muted">No images in Drive matched. Drop a file or use Hall stills.</p>
              ) : (
                <ul className="grid grid-cols-3 gap-2">
                  {driveImages.map((img) => {
                    const src = driveArtSrc(img.id);
                    return (
                      <li key={img.id}>
                        <button
                          type="button"
                          onClick={() => assign(src)}
                          className={cn(
                            "w-full rounded-lg bg-elevated p-1 text-left shadow-border",
                            current === src && "shadow-border-hover",
                          )}
                        >
                          <ArtImage
                            src={src}
                            fallback={slot.fallback}
                            alt=""
                            className="aspect-2/3 w-full rounded-md outline outline-1 -outline-offset-1 outline-white/10"
                          />
                          <p className="mt-1 truncate px-0.5 text-xs text-muted">{img.name}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "drop" ? (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void onFiles(e.dataTransfer.files);
                }}
                className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl bg-elevated px-4 text-center shadow-border"
              >
                <Upload className="size-5 text-muted" />
                <span className="text-sm text-fg">{dropping ? "Reading stills…" : "Drop photos or browse"}</span>
                <span className="text-xs text-muted">From Drive downloads or the camera roll. Assigned to {slot.label}.</span>
              </button>
              {stash.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2">
                  {stash.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => assign(item.src)}
                        className={cn(
                          "w-full rounded-lg bg-elevated p-1 text-left shadow-border",
                          current === item.src && "shadow-border-hover",
                        )}
                      >
                        <ArtImage
                          src={item.src}
                          fallback={slot.fallback}
                          alt=""
                          className="aspect-2/3 w-full rounded-md outline outline-1 -outline-offset-1 outline-white/10"
                        />
                        <p className="mt-1 truncate px-0.5 text-xs text-muted">{item.name}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <Button
            variant="ghost"
            className="min-h-11 w-full"
            onClick={() => {
              playClick();
              restoreHallArt();
            }}
          >
            Restore Hall stills
          </Button>
        </div>
      </aside>
    </div>
  );
}

function keyOf(slot: ArtSlot) {
  return `${slot.kind}:${slot.id}`;
}

function TabBtn({
  id,
  tab,
  setTab,
  icon,
  label,
}: {
  id: Tab;
  tab: Tab;
  setTab: (t: Tab) => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playClick();
        setTab(id);
      }}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md text-sm",
        tab === id ? "bg-surface text-fg shadow-border" : "text-muted",
      )}
      aria-pressed={tab === id}
      aria-label={`${label} library`}
    >
      {icon}
      {label}
    </button>
  );
}

function DriveStatus({
  kind,
  message,
  loginUrl,
  onLogin,
  onRetry,
}: {
  kind: string;
  message: string;
  loginUrl?: string;
  onLogin: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-elevated px-4 py-4 shadow-border">
      <p className="text-sm leading-relaxed text-muted">{message}</p>
      {kind === "login" && loginUrl ? (
        <Button className="min-h-11 w-full" onClick={onLogin}>
          Continue with Grok
        </Button>
      ) : (
        <Button variant="secondary" className="min-h-11 w-full" onClick={onRetry}>
          Try Drive again
        </Button>
      )}
    </div>
  );
}

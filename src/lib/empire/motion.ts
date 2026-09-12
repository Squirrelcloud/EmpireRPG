import { useEffect, useState } from "react";

const CLOSE_MS = 160;

/** Keep an overlay mounted through its exit animation. */
export function useOverlayPresence(open: boolean) {
  const [present, setPresent] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setLeaving(false);
      return;
    }
    if (!present) return;
    setLeaving(true);
    const id = window.setTimeout(() => {
      setPresent(false);
      setLeaving(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [open, present]);

  return { present: open || present, leaving };
}

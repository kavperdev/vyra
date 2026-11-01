"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSiteMedia } from "@/lib/actions/content";
import { MEDIA_SLOTS, type SiteMediaItem } from "@/lib/camps";
import { createClient } from "@/lib/supabase/client";

/** Scales a photo down to at most 2400 px on the longer side and saves it as JPEG. */
async function prepare(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

function Slot({ slot, label, fallback, current }: { slot: string; label: string; fallback: string | null; current?: SiteMediaItem }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const shown = current?.url ?? fallback;

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await prepare(file);
      if (blob.size > 10 * 1024 * 1024) {
        toast.error("Zdjęcie jest za duże (maks. 10 MB).");
        return;
      }
      const supabase = createClient();
      const path = `${slot}/${Date.now().toString(36)}.jpg`;
      const { error } = await supabase.storage.from("site").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) {
        toast.error("Nie udało się wgrać zdjęcia. Spróbuj ponownie.");
        return;
      }
      const { data } = supabase.storage.from("site").getPublicUrl(path);
      const res = await setSiteMedia(slot, data.publicUrl, label);
      if (res.ok) {
        toast.success(res.message ?? "Zapisano");
        router.refresh();
      } else toast.error(res.error);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-2"
        aria-label={`Zmień zdjęcie: ${label}`}
      >
        {shown ? (
          // Plain img: panel thumbnails, any source.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="absolute inset-0 size-full object-cover" />
        ) : null}
        <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ImageUp className="size-6" />
        </span>
        {busy ? <span className="absolute inset-0 grid place-items-center bg-black/60 text-sm text-white">Wgrywanie…</span> : null}
        {!current ? (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] text-white">domyślne</span>
        ) : null}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug">{label}</p>
        {current ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            title="Przywróć domyślne"
            onClick={async () => {
              setBusy(true);
              const res = await setSiteMedia(slot, null, "");
              setBusy(false);
              if (res.ok) router.refresh();
              else toast.error(res.error);
            }}
          >
            <RotateCcw className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function MediaEditor({ media }: { media: Record<string, SiteMediaItem> }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {MEDIA_SLOTS.map((m) => (
        <Slot key={m.slot} {...m} current={media[m.slot]} />
      ))}
    </div>
  );
}

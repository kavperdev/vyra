"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { tl } from "@/lib/i18n/runtime";

const BUCKET = "site-photos";
const MAX = 1400;

/** Scales the photo down to at most 1400 px and re-encodes it as JPEG, so pages stay fast. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

/** Uploads a photo to the public "site-photos" bucket and returns its URL through onChange. */
export function PhotoUpload({ value, onChange, folder }: { value: string; onChange: (url: string) => void; folder: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error(tl("Wybierz plik ze zdjęciem.", "Choose an image file."));
    setBusy(true);
    try {
      const blob = await shrink(file).catch(() => file);
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) {
        toast.error(
          /bucket|not found/i.test(error.message)
            ? tl("Brak miejsca na zdjęcia. Uruchom migrację 20261102000300_site_photos.sql w Supabase.", "No photo storage yet. Run migration 20261102000300_site_photos.sql in Supabase.")
            : tl(`Nie udało się wgrać zdjęcia: ${error.message}`, `Upload failed: ${error.message}`),
        );
        return;
      }
      onChange(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      toast.success(tl("Zdjęcie wgrane. Kliknij Zapisz.", "Photo uploaded. Click Save."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
        {value ? (
          <div role="img" aria-label={tl("Podgląd zdjęcia", "Photo preview")} className="size-full bg-cover bg-center" style={{ backgroundImage: `url(${value})` }} />
        ) : (
          <ImagePlus className="size-6 text-subtle" />
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {value ? tl("Zmień zdjęcie", "Change photo") : tl("Wgraj zdjęcie", "Upload photo")}
      </Button>
      {value ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
          <X className="size-4" /> {tl("Usuń", "Remove")}
        </Button>
      ) : null}
    </div>
  );
}

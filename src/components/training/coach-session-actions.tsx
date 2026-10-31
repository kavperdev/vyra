"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, Copy, MoreHorizontal, Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { copySession, deleteSession, rescheduleSession, saveSessionAsTemplate } from "@/lib/actions/sessions";

type Mode = null | "reschedule" | "copy" | "template" | "delete";

export function CoachSessionActions({
  sessionId,
  athleteId,
  title,
  date,
  executed,
  athletes,
}: {
  sessionId: string;
  athleteId: string;
  title: string;
  date: string;
  executed: boolean;
  athletes: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [pending, start] = useTransition();
  const [newDate, setNewDate] = useState(date);
  const [target, setTarget] = useState(athleteId);
  const [name, setName] = useState(title);
  const [description, setDescription] = useState("");

  const close = () => setMode(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/coach/sessions/${sessionId}/edit`}>
            <Pencil className="size-4" /> Edytuj
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Więcej akcji">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!executed ? (
              <DropdownMenuItem onSelect={() => setMode("reschedule")}>
                <CalendarClock /> Zmień datę
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => setMode("copy")}>
              <Copy /> Kopiuj trening
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setMode("template")}>
              <Save /> Zapisz jako szablon
            </DropdownMenuItem>
            {!executed ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setMode("delete")} className="text-problem">
                  <Trash2 /> Usuń
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={mode === "reschedule"} onOpenChange={(o: boolean) => !o && close()}>
        <DialogContent title="Zmień datę treningu" description="Zawodnik dostanie powiadomienie o zmianie terminu.">
          <Field label="Nowa data" htmlFor="reschedule-date">
            <Input id="reschedule-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </Field>
          <Button
            disabled={pending || !newDate || newDate === date}
            onClick={() =>
              start(async () => {
                const res = await rescheduleSession({ id: sessionId, date: newDate });
                if (res.ok) {
                  toast.success(res.message);
                  close();
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            Zapisz nową datę
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "copy"} onOpenChange={(o: boolean) => !o && close()}>
        <DialogContent title="Kopiuj trening" description="Tworzy nowy, niezależny trening z tym samym planem. Wyniki nie są kopiowane.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data" htmlFor="copy-date">
              <Input id="copy-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </Field>
            <Field label="Zawodnik" htmlFor="copy-athlete">
              <Select id="copy-athlete" value={target} onChange={(e) => setTarget(e.target.value)}>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button
            disabled={pending || !newDate}
            onClick={() =>
              start(async () => {
                const res = await copySession({ id: sessionId, date: newDate, athlete_id: target });
                if (res.ok && res.data) {
                  toast.success(res.message);
                  close();
                  router.push(`/coach/sessions/${res.data.id}`);
                } else if (!res.ok) toast.error(res.error);
              })
            }
          >
            Utwórz kopię
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "template"} onOpenChange={(o: boolean) => !o && close()}>
        <DialogContent title="Zapisz jako szablon" description="Szablon jest osobnym rekordem: późniejsze zmiany w nim nie wpływają na ten trening.">
          <Field label="Nazwa szablonu" htmlFor="tpl-name">
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
          </Field>
          <Field label="Opis" htmlFor="tpl-desc">
            <Textarea id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </Field>
          <Button
            disabled={pending || !name.trim()}
            onClick={() =>
              start(async () => {
                const res = await saveSessionAsTemplate({ session_id: sessionId, name, description });
                if (res.ok) {
                  toast.success(res.message);
                  close();
                } else toast.error(res.error);
              })
            }
          >
            Zapisz szablon
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "delete"} onOpenChange={(o: boolean) => !o && close()}>
        <DialogContent title="Usunąć trening?" description="Trening zniknie z planu i kalendarza zawodnika. Tej operacji nie można cofnąć.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteSession(sessionId);
                  if (res.ok) {
                    toast.success(res.message);
                    router.push(`/coach/athletes/${athleteId}?tab=plan`);
                  } else toast.error(res.error);
                })
              }
            >
              Usuń trening
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

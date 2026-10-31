"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { updateOwnProfile } from "@/lib/actions/athletes";
import { updatePassword } from "@/lib/actions/auth";

export function AccountSettings({ fullName, email }: { fullName: string; email: string | null }) {
  const [name, setName] = useState(fullName);
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await updateOwnProfile({ full_name: name });
                if (res.ok) toast.success(res.message);
                else toast.error(res.error);
              });
            }}
          >
            <Field label="Imię i nazwisko" htmlFor="acc-name">
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="E-mail" htmlFor="acc-email" hint="Adres logowania.">
              <Input id="acc-email" value={email ?? ""} readOnly disabled />
            </Field>
            <Field label="Motyw" htmlFor="acc-theme">
              <Select id="acc-theme" value={theme ?? "dark"} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">Ciemny (domyślny VYRA)</option>
                <option value="light">Jasny</option>
                <option value="system">Jak w systemie</option>
              </Select>
            </Field>
            <Button type="submit" className="w-fit" disabled={pending}>Zapisz profil</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Zmiana hasła</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await updatePassword(pw);
                if (res.ok) {
                  setPw({ password: "", confirm: "" });
                  setErrors({});
                  toast.success(res.message);
                } else {
                  setErrors(res.fieldErrors ?? {});
                  toast.error(res.error);
                }
              });
            }}
          >
            <Field label="Nowe hasło" htmlFor="acc-pw" error={errors.password?.[0]} hint="Co najmniej 8 znaków, litera i cyfra.">
              <Input id="acc-pw" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
            </Field>
            <Field label="Powtórz hasło" htmlFor="acc-pw2" error={errors.confirm?.[0]}>
              <Input id="acc-pw2" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <Button type="submit" className="w-fit" disabled={pending}>Zmień hasło</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

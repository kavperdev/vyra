"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PushSettings } from "@/components/shell/push-toggle";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { updateOwnProfile } from "@/lib/actions/athletes";
import { updatePassword } from "@/lib/actions/auth";
import { tl } from "@/lib/i18n/runtime";

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
          <CardTitle>{tl("Profil", "Profile")}</CardTitle>
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
            <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="acc-name">
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label={tl("E-mail", "Email")} htmlFor="acc-email" hint={tl("Adres logowania.", "Your sign-in address.")}>
              <Input id="acc-email" value={email ?? ""} readOnly disabled />
            </Field>
            <Field label={tl("Motyw", "Theme")} htmlFor="acc-theme">
              <Select id="acc-theme" value={theme ?? "dark"} onChange={(e) => setTheme(e.target.value)}>
                <option value="dark">{tl("Ciemny (domyślny VYRA)", "Dark (VYRA default)")}</option>
                <option value="light">{tl("Jasny", "Light")}</option>
                <option value="system">{tl("Jak w systemie", "System")}</option>
              </Select>
            </Field>
            <Button type="submit" className="w-fit" disabled={pending}>{tl("Zapisz profil", "Save profile")}</Button>
          </form>
        </CardContent>
      </Card>
      <PushSettings />
      <Card>
        <CardHeader>
          <CardTitle>{tl("Zmiana hasła", "Change password")}</CardTitle>
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
            <Field label={tl("Nowe hasło", "New password")} htmlFor="acc-pw" error={errors.password?.[0]} hint={tl("Co najmniej 8 znaków, litera i cyfra.", "At least 8 characters, a letter and a number.")}>
              <Input id="acc-pw" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
            </Field>
            <Field label={tl("Powtórz hasło", "Repeat password")} htmlFor="acc-pw2" error={errors.confirm?.[0]}>
              <Input id="acc-pw2" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <Button type="submit" className="w-fit" disabled={pending}>{tl("Zmień hasło", "Change password")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/** Shown instead of the auth forms until Supabase is configured. */
export function SetupNotice() {
  return (
    <div role="status" className="grid gap-3 rounded-lg border border-warning/40 bg-warning/10 p-5 text-sm">
      <p className="font-semibold text-warning">Aplikacja nie jest jeszcze połączona z bazą danych</p>
      <p className="text-muted">
        Utwórz projekt Supabase, uruchom migracje z katalogu <code className="font-mono">supabase/migrations</code> i uzupełnij plik
        <code className="font-mono"> .env.local</code> według <code className="font-mono">.env.example</code>. Instrukcja krok po kroku jest w README.
      </p>
    </div>
  );
}

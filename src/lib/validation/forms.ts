import { z } from "zod";
import { decimalField, intField, isoDate, optionalText } from "./fields";

export const emailField = z.string().trim().toLowerCase().email("Podaj poprawny adres e-mail").max(254);
export const passwordField = z
  .string()
  .min(8, "Hasło musi mieć co najmniej 8 znaków")
  .max(72, "Hasło może mieć najwyżej 72 znaki")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Hasło musi zawierać literę i cyfrę");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Podaj hasło"),
});

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  email: emailField,
  password: passwordField,
});

export const inviteSignupSchema = signupSchema.extend({ token: z.string().min(10).max(200) });

export const forgotSchema = z.object({ email: emailField });

export const newPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Hasła nie są takie same" });

export const invitationSchema = z.object({
  email: emailField,
  full_name: z.string().trim().max(120),
  message: optionalText(1000),
});

export const athleteProfileSchema = z.object({
  athlete_id: z.string().uuid(),
  sport_goal: optionalText(300),
  birth_year: intField(1900, 2100, "Rok 1900–2100"),
  height_cm: decimalField(50, 260, "Wzrost 50–260 cm"),
  weight_kg: decimalField(20, 300, "Masa 20–300 kg"),
  resting_hr: intField(25, 120, "Tętno spoczynkowe 25–120"),
  max_hr: intField(100, 240, "Tętno maks. 100–240"),
  lthr: intField(80, 230, "LTHR 80–230"),
  easy_hr_max: intField(80, 230, "Tętno easy 80–230"),
  athlete_notes: optionalText(4000),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
});

export const planSchema = z
  .object({
    id: z.string().optional(),
    athlete_id: z.string().uuid(),
    name: z.string().trim().min(1, "Podaj nazwę planu").max(160),
    description: optionalText(4000),
    goal: optionalText(300),
    start_date: isoDate,
    end_date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Wybierz datę"),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, { path: ["end_date"], message: "Koniec nie może być przed początkiem" });

export const commentSchema = z.object({
  session_id: z.string().uuid(),
  body: z.string().trim().min(1, "Napisz komentarz").max(4000),
});

export const coachNoteSchema = z.object({
  athlete_id: z.string().uuid(),
  body: z.string().trim().min(1, "Notatka jest pusta").max(8000),
});

export const recordSchema = z
  .object({
    id: z.string().optional(),
    athlete_id: z.string().uuid(),
    kind: z.enum(["running", "strength", "other"]),
    label: z.string().trim().min(1, "Podaj nazwę rekordu").max(120),
    distance_km: z.string().trim(),
    exercise_name: optionalText(120),
    value: z.string().trim().min(1, "Podaj wynik"),
    unit: z.enum(["s", "kg", "reps", "m"]),
    achieved_on: isoDate,
    source: z.enum(["manual", "execution", "race", "test"]),
    session_id: z.string(),
    comment: optionalText(1000),
  });

export const goalSchema = z.object({
  id: z.string().optional(),
  athlete_id: z.string().uuid(),
  name: z.string().trim().min(1, "Podaj nazwę celu").max(160),
  description: optionalText(2000),
  start_value: z.string().trim(),
  target_value: z.string().trim(),
  current_value: z.string().trim(),
  unit: optionalText(20),
  lower_is_better: z.boolean(),
  deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Wybierz datę"),
  status: z.enum(["active", "achieved", "abandoned"]),
});

export const templateMetaSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę szablonu").max(160),
  description: optionalText(2000),
});

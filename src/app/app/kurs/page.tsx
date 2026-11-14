import { CourseBar, LessonList } from "@/components/app/course-progress";
import { COURSE } from "@/lib/app/course";

export const metadata = { title: "Kurs" };

export default function AppCourse() {
  return (
    <div className="app-rise grid gap-4">
      <div className="pt-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">Darmowy kurs VYRA</p>
        <h1 className="display mt-2 text-[34px]">{COURSE.title}</h1>
        <p className="mt-2 leading-relaxed text-white/65">{COURSE.lead}</p>
      </div>
      <CourseBar />
      <LessonList />
      <p className="text-center text-[12.5px] text-white/40">Postęp zapisuje się na tym telefonie. Konto nie jest potrzebne.</p>
    </div>
  );
}

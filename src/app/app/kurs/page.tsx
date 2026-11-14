import { CourseBar, LessonList } from "@/components/app/course-progress";
import { Label, Title } from "@/components/app/ui";
import { COURSE } from "@/lib/app/course";

export const metadata = { title: "Kurs" };

export default function AppCourse() {
  return (
    <div className="app-rise grid grid-cols-1">
      <div className="pb-6 pt-1">
        <Label>Darmowy kurs VYRA · 9 lekcji</Label>
        <Title className="mt-3">
          Biegaj
          <br />
          mądrze.
        </Title>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">{COURSE.lead}</p>
        <CourseBar className="mt-6" />
      </div>
      <div className="border-t border-white/15">
        <LessonList />
      </div>
      <p className="mt-6 text-[12px] leading-relaxed text-white/35">Postęp zapisuje się na tym telefonie. Konto nie jest potrzebne.</p>
    </div>
  );
}

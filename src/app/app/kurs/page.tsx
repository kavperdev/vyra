import { CourseBar, LessonList } from "@/components/app/course-progress";
import { PageHead } from "@/components/app/ui";
import { COURSE } from "@/lib/app/course";

export const metadata = { title: "Kurs" };

export default function AppCourse() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={COURSE.title} sub={COURSE.lead} />
      <CourseBar className="mb-4" />
      <LessonList />
      <p className="mt-4 px-1 text-center text-[11.5px] text-white/35">Postęp zapisuje się na tym telefonie. Konto nie jest potrzebne.</p>
    </div>
  );
}

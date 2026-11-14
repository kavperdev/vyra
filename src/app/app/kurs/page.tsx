import { CourseBar, LessonList } from "@/components/app/course-progress";
import { Kicker, TrackLines } from "@/components/app/ui";
import { COURSE } from "@/lib/app/course";

export const metadata = { title: "Kurs" };

export default function AppCourse() {
  return (
    <div className="app-rise grid grid-cols-1 gap-4">
      <div className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-1 pt-6">
        <TrackLines className="-right-24 -top-28 size-[380px] opacity-80" />
        <Kicker className="relative">Darmowy kurs VYRA</Kicker>
        <h1 className="display relative mt-2 text-[40px] leading-[0.98] tracking-tight">{COURSE.title}</h1>
        <p className="relative mt-3 text-[15px] leading-relaxed text-white/60">{COURSE.lead}</p>
      </div>
      <CourseBar />
      <LessonList />
      <p className="px-6 text-center text-[12px] leading-relaxed text-white/35">Postęp zapisuje się na tym telefonie. Konto nie jest potrzebne.</p>
    </div>
  );
}

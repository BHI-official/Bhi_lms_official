import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { requireInstructor } from "@/lib/auth";
import { SheetView, loadEnrollmentFor } from "@/components/sheet-view";

export const metadata: Metadata = pageMetadata({
  title: "Attendance sheet",
  description: "The attendance sheet for one of your students.",
  banner: "instructor",
});

export const dynamic = "force-dynamic";

export default async function InstructorSheetPage({ params, searchParams }: { params: Promise<{ enrollmentId: string }>; searchParams: Promise<{ month?: string; period?: string }> }) {
  const user = await requireInstructor();
  const { enrollmentId } = await params;
  const enrollment = await loadEnrollmentFor(user, enrollmentId);
  return (
    <SheetView user={user} enrollment={enrollment} sp={await searchParams} basePath={`/instructor/attendance/${enrollmentId}`}
      back={<Link href={`/instructor/classes/${enrollment.classId}`} className="text-sm text-pine-700 underline">Back to the class</Link>} />
  );
}

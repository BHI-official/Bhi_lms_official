import Link from "next/link";
import type { Metadata } from "next";
import { InstructorRegisterForm } from "./instructor-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Instructor sign-up",
  description: "Instructors at Bright Horizon Institute sign up here. After an admin approves your account, you can see your courses, take attendance and write monthly progress reports.",
  path: "/register/instructor",
  banner: "instructorSignup",
  index: true,
});

export default function InstructorRegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Instructor sign-up</h1>
      <p className="mt-1 text-sm text-slate-600">
        We'll email you a 6-digit code to confirm your address. A BHI admin then reviews your account; you'll get access to your courses once it's approved.
      </p>
      <InstructorRegisterForm />
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/login" className="text-pine-700 underline">Already have an account? Sign in</Link>
        <Link href="/register" className="text-pine-700 underline">Student sign-up</Link>
      </div>
    </>
  );
}

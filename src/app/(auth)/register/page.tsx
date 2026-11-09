import Link from "next/link";
import type { Metadata } from "next";
import { env } from "@/lib/env";
import { RegisterForm } from "./register-form";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Apply online: create a student account",
  description: "Start your Bright Horizon Institute enrollment online. Create a student account, choose your course, complete your forms and documents, and submit your application from any device.",
  path: "/register",
  banner: "register",
  index: true,
});

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Create your student account</h1>
      <p className="mt-1 text-sm text-slate-600">We'll email you a 6-digit code to confirm it's you, then take you to the enrollment forms.</p>
      <RegisterForm gmailOnly={env().REQUIRE_GMAIL} />
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/login" className="text-pine-700 underline">Already have an account? Sign in</Link>
        <Link href="/register/instructor" className="text-pine-700 underline">Instructor? Sign up here</Link>
      </div>
    </>
  );
}
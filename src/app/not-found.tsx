import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist or you don't have access to it.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate-600">The page doesn't exist or you don't have access to it.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-pine-700 underline">Go to your home page</Link>
    </main>
  );
}

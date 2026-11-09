import { Journey } from "@/components/journey";
import { OrganizationJsonLd } from "@/components/json-ld";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[420px_1fr]">
      <OrganizationJsonLd />
      <aside className="hidden flex-col justify-between bg-pine-800 p-10 text-white lg:flex">
        <div>
          <img src="/brand/bhi-logo-white.png" alt="Bright Horizon Institute, established 2009" width={96} height={96} className="h-24 w-24" />
          <p className="mt-10 max-w-xs text-2xl font-semibold leading-snug">From application to your first class, in one place.</p>
        </div>
        <Journey current={0} tone="dark" />
        <p className="text-xs text-white/60">Bright Horizon Institute, Jersey City. For Equus / One-Stop, DFS and private students.</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <img src="/brand/bhi-badge.png" alt="Bright Horizon Institute" width={56} height={56} className="mb-6 h-14 w-14 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}

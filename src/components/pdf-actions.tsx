"use client";

import { useRef, useState } from "react";

/**
 * "Download" and "Print" for a generated form PDF (the form on BHI's original layout, filled in).
 * Print loads the PDF in a hidden frame and opens the browser's print dialog; where a browser can't
 * print a framed PDF (some Safari versions), it opens the PDF in a new tab to print from there.
 */
export function PdfActions({ href, label, compact }: { href: string; label: string; compact?: boolean }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [busy, setBusy] = useState(false);
  const sep = href.includes("?") ? "&" : "?";

  function openTab() {
    window.open(href, "_blank", "noopener");
  }

  function print() {
    if (busy) return;
    setBusy(true);
    frame.current?.remove();
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    f.title = `${label} (for printing)`;
    let done = false;
    const finish = (fallback: boolean) => {
      if (done) return;
      done = true;
      setBusy(false);
      if (fallback) openTab();
    };
    f.onload = () => {
      // The PDF viewer needs a moment after load before it can print.
      setTimeout(() => {
        try {
          f.contentWindow?.focus();
          f.contentWindow?.print();
          finish(false);
        } catch {
          finish(true);
        }
      }, 400);
    };
    setTimeout(() => finish(true), 20000); // never leave the button stuck
    f.src = href;
    document.body.appendChild(f);
    frame.current = f;
  }

  const cls = compact
    ? "text-sm font-semibold text-pine-700 underline disabled:opacity-60"
    : "rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-mist disabled:opacity-60";
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <a href={`${href}${sep}download=1`} className={cls} aria-label={`Download ${label} (PDF)`}>Download</a>
      <button type="button" onClick={print} disabled={busy} className={cls} aria-label={`Print ${label}`}>
        {busy ? "Preparing..." : "Print"}
      </button>
    </span>
  );
}

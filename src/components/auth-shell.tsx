import type { ReactNode } from "react";
import { site } from "@/config/site";
import { cardClass } from "./ui";

/** Rahmen für Anmelde- und Hinweisseiten. */
export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- statisches SVG */}
          <img src="/icon.svg" alt="" className="size-9" />
          <span className="font-serif text-xl font-semibold">{site.name}</span>
        </div>
        <div className={`${cardClass} flex flex-col gap-6 p-6 sm:p-8`}>
          <div>
            <h1 className="font-serif text-[1.75rem] font-semibold leading-tight">{title}</h1>
            {intro ? <p className="mt-2 text-muted">{intro}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/config/site";
import { buttonClass } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      {/* eslint-disable-next-line @next/next/no-img-element -- statisches SVG */}
      <img src="/icon.svg" alt="" className="size-12" />
      <p className="text-sm font-medium tracking-wide text-muted uppercase">Im Aufbau</p>
      <h1 className="font-serif text-[2.6rem] leading-tight font-semibold tracking-tight">{site.name}</h1>
      <p className="font-serif text-xl leading-relaxed">{site.description}</p>
      <p className="text-muted">
        Der Feed für Praxen folgt in Phase 3. Derzeit werden Quellen angebunden und die Meldungen im Redaktionsbereich
        geprüft.
      </p>
      <p>
        <Link href="/admin" className={buttonClass}>
          Zum Redaktionsbereich <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </p>
    </main>
  );
}

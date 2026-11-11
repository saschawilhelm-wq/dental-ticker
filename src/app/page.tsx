import Link from "next/link";
import { site } from "@/config/site";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Im Aufbau</p>
      <h1 className="text-3xl font-semibold">{site.name}</h1>
      <p className="text-lg text-muted">{site.description}</p>
      <p className="text-muted">
        Der Nutzer-Feed folgt in Phase 3. Derzeit werden Quellen angebunden und die Rohdaten im
        Admin-Bereich geprüft.
      </p>
      <p>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 font-medium text-accent-foreground"
        >
          Zum Admin-Bereich
        </Link>
      </p>
    </main>
  );
}

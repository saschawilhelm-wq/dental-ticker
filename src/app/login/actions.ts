"use server";

import { redirect } from "next/navigation";
import { exchangeLoginToken, requestLoginLink } from "@/lib/auth/login";
import { getMailer, MailerNotConfiguredError } from "@/lib/auth/mailer";
import { endSession, setSessionCookie } from "@/lib/auth/session";

export type LoginFormState = { status: "idle" | "sent" | "error"; message?: string };

function appUrl(): string {
  const url = process.env.APP_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    // Nie aus dem Host-Header ableiten: Sonst ließe sich ein Login-Link auf eine fremde Domain umlenken.
    throw new Error("APP_URL ist nicht gesetzt.");
  }
  return "http://localhost:3000";
}

export async function requestLoginAction(_prev: LoginFormState, form: FormData): Promise<LoginFormState> {
  const email = form.get("email");
  if (typeof email !== "string") return { status: "error", message: "Bitte eine E-Mail-Adresse angeben." };
  try {
    const outcome = await requestLoginLink(email, { baseUrl: appUrl(), mailer: getMailer() });
    if (outcome.kind === "invalid_email") {
      return { status: "error", message: "Bitte eine gültige E-Mail-Adresse angeben." };
    }
    // „sent“ und „rate_limited“ sehen gleich aus, damit niemand erfährt, welche Adressen ein Konto haben.
    return { status: "sent" };
  } catch (error) {
    if (error instanceof MailerNotConfiguredError) return { status: "error", message: error.message };
    console.error("Login-Link fehlgeschlagen", error);
    return { status: "error", message: "Der Login-Link konnte gerade nicht erzeugt werden. Bitte später erneut versuchen." };
  }
}

export async function confirmLoginAction(form: FormData): Promise<void> {
  const sessionToken = await exchangeLoginToken(form.get("token"));
  if (!sessionToken) redirect("/login?fehler=link-ungueltig");
  await setSessionCookie(sessionToken);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login?abgemeldet=1");
}

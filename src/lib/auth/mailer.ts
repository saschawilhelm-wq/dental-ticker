/**
 * Versand von Login-Links. In Phase 1 gibt es nur die Entwicklungs-Variante,
 * die den Link ins Server-Log schreibt. Ein echter Versand (z. B. Resend)
 * folgt mit dem Tagesbriefing in Phase 3.
 */
export type Mailer = {
  sendLoginLink(to: string, link: string): Promise<void>;
};

export class MailerNotConfiguredError extends Error {
  constructor() {
    super("Für den Login-Link ist noch kein E-Mail-Versand eingerichtet.");
    this.name = "MailerNotConfiguredError";
  }
}

const consoleMailer: Mailer = {
  async sendLoginLink(to, link) {
    console.info(`\n[Login-Link für ${to}]\n${link}\n`);
  },
};

const unconfiguredMailer: Mailer = {
  async sendLoginLink() {
    throw new MailerNotConfiguredError();
  },
};

/**
 * Im Produktivbetrieb darf ein Login-Link nie im Log landen — wer Logs lesen
 * kann, könnte sich sonst anmelden. Ohne eingerichteten Versand schlägt die
 * Anmeldung dort deshalb mit einer klaren Meldung fehl.
 */
export function getMailer(): Mailer {
  return process.env.NODE_ENV === "production" ? unconfiguredMailer : consoleMailer;
}

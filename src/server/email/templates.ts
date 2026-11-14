/**
 * Modèles d'emails transactionnels Tamurt Vidéo (HTML compatible clients mail
 * + version texte). Les liens sont absolus, construits à partir de l'URL du site.
 */
export type EmailTemplate =
  | "billing.subscription_confirmed"
  | "billing.payment_failed"
  | "billing.cancellation_scheduled"
  | "billing.subscription_canceled"
  | "billing.plan_changed"
  | "catalog.title_available"
  | "request.status_changed"
  | "account.notice"
  | "external.notice"
  | "staff.alert";

export type RenderedEmail = { subject: string; html: string; text: string; preview: string };

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const EXTERNAL_FOOTER =
  "Vous recevez cet email en réponse à une démarche effectuée auprès de Tamurt Vidéo. Répondez simplement à ce message pour toute question.";

function layout(input: {
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footerNote?: string;
}) {
  const body = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#b0b0b8;">${escapeHtml(p)}</p>`,
    )
    .join("");
  const cta = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px 0;"><tr><td style="border-radius:14px;background:#e5162f;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(input.cta.label)}</a></td></tr></table>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"></head>
<body style="margin:0;padding:0;background:#0f0f10;font-family:Helvetica,Arial,sans-serif;color:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f10;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1c1c1f;border:1px solid #2e2e33;border-radius:16px;">
<tr><td style="padding:28px 32px 8px 32px;"><span style="font-size:18px;font-weight:800;letter-spacing:2px;color:#ff5a67;vertical-align:middle;">TAMURT</span> <span style="font-size:18px;font-weight:800;color:#ffffff;vertical-align:middle;">Vidéo</span></td></tr>
<tr><td style="padding:16px 32px 12px 32px;"><h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(input.heading)}</h1>${body}${cta}</td></tr>
<tr><td style="padding:20px 32px 28px 32px;border-top:1px solid #2e2e33;"><p style="margin:0;font-size:12px;line-height:1.6;color:#b0b0b8;">${escapeHtml(input.footerNote ?? "Vous recevez cet email car il concerne votre compte Tamurt Vidéo. Gérez vos préférences de notification depuis votre compte.")}</p></td></tr>
</table></td></tr></table></body></html>`;
}

function text(input: {
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
}) {
  return [
    input.heading,
    "",
    ...input.paragraphs,
    ...(input.cta ? ["", `${input.cta.label} : ${input.cta.url}`] : []),
    "",
    "— Tamurt Vidéo",
  ].join("\n");
}

export function renderEmail(
  template: EmailTemplate,
  data: { title: string; body?: string | null; link?: string | null; siteUrl: string },
): RenderedEmail {
  const url = data.link
    ? `${data.siteUrl}${data.link.startsWith("/") ? data.link : `/${data.link}`}`
    : data.siteUrl;
  const paragraphs: string[] = [];
  let cta: { label: string; url: string } | undefined;
  let subject = data.title;

  switch (template) {
    case "billing.subscription_confirmed":
      subject = "Votre abonnement Tamurt Vidéo est confirmé";
      paragraphs.push(data.body ?? "Merci ! Votre abonnement est actif.");
      paragraphs.push(
        "Il se renouvelle automatiquement chaque mois. Vous pouvez le résilier à tout moment depuis votre compte.",
      );
      cta = { label: "Gérer mon abonnement", url: `${data.siteUrl}/compte/abonnement` };
      break;
    case "billing.payment_failed":
      subject = "Échec du paiement de votre abonnement";
      paragraphs.push(data.body ?? "Le dernier paiement de votre abonnement n'a pas abouti.");
      paragraphs.push(
        "Mettez à jour votre moyen de paiement pour conserver votre accès. Aucune donnée de carte n'est stockée par Tamurt Vidéo.",
      );
      cta = { label: "Mettre à jour le paiement", url: `${data.siteUrl}/compte/abonnement` };
      break;
    case "billing.cancellation_scheduled":
      subject = "Résiliation de votre abonnement programmée";
      paragraphs.push(
        data.body ?? "Votre abonnement prendra fin à l'échéance de la période en cours.",
      );
      cta = { label: "Réactiver mon abonnement", url: `${data.siteUrl}/compte/abonnement` };
      break;
    case "billing.subscription_canceled":
      subject = "Votre abonnement a pris fin";
      paragraphs.push(data.body ?? "Votre abonnement est terminé. Merci pour votre soutien.");
      cta = { label: "Voir les formules", url: `${data.siteUrl}/offres` };
      break;
    case "billing.plan_changed":
      subject = "Changement de formule confirmé";
      paragraphs.push(data.body ?? "Votre changement de formule a bien été pris en compte.");
      cta = { label: "Voir mon abonnement", url: `${data.siteUrl}/compte/abonnement` };
      break;
    case "catalog.title_available":
      paragraphs.push(data.body ?? "Une œuvre que vous attendiez est disponible.");
      cta = { label: "Voir l'œuvre", url };
      break;
    case "request.status_changed":
      paragraphs.push(data.body ?? "Le statut d'une demande que vous suivez a évolué.");
      paragraphs.push("Rappel : une demande ne constitue pas une promesse de disponibilité.");
      cta = { label: "Suivre la demande", url };
      break;
    case "staff.alert":
      paragraphs.push(data.body ?? "Une alerte nécessite l'attention de l'équipe.");
      cta = { label: "Ouvrir l'administration", url };
      break;
    case "external.notice":
      for (const paragraph of (data.body ?? "").split(/\n{2,}/))
        if (paragraph.trim()) paragraphs.push(paragraph.trim());
      if (data.link) cta = { label: "Ouvrir", url };
      break;
    default:
      paragraphs.push(data.body ?? "");
      if (data.link) cta = { label: "Ouvrir", url };
  }

  const heading = template.startsWith("billing.") ? subject : data.title;
  return {
    subject,
    html: layout({
      heading,
      paragraphs,
      cta,
      footerNote: template === "external.notice" ? EXTERNAL_FOOTER : undefined,
    }),
    text: text({ heading, paragraphs, cta }),
    preview: paragraphs[0] ?? heading,
  };
}

export function templateForNotificationType(type: string): EmailTemplate {
  const known: EmailTemplate[] = [
    "billing.subscription_confirmed",
    "billing.payment_failed",
    "billing.cancellation_scheduled",
    "billing.subscription_canceled",
    "billing.plan_changed",
    "catalog.title_available",
    "request.status_changed",
    "staff.alert",
  ];
  if ((known as string[]).includes(type)) return type as EmailTemplate;
  if (type.startsWith("staff.")) return "staff.alert";
  return "account.notice";
}

/** Préférence utilisateur gouvernant l'envoi par email d'un type de notification. */
export function preferenceKeyForType(
  type: string,
): "email_billing" | "email_requests" | "email_catalog" | "email_news" | null {
  if (type.startsWith("billing.")) return "email_billing";
  if (type.startsWith("request.")) return "email_requests";
  if (type.startsWith("catalog.")) return "email_catalog";
  if (type.startsWith("news.")) return "email_news";
  return null;
}

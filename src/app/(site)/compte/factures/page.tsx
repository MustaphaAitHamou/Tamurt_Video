import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { DownloadIcon, ReceiptIcon } from "lucide-react";

import { AccountSection } from "@/components/account/section";
import { EmptyState } from "@/components/catalog/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isLocale, localeIntlTag } from "@/i18n/config";
import { formatDate, formatPrice } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "Factures", robots: { index: false } };

export default async function InvoicesPage() {
  const viewer = await requireViewer("/compte/factures");
  const [t, rawLocale] = await Promise.all([getTranslations("account"), getLocale()]);
  const locale = isLocale(rawLocale) ? localeIntlTag[rawLocale] : "fr-FR";
  const supabase = await createSupabaseServerClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, number, status, currency, amount_paid_cents, amount_due_cents, amount_refunded_cents, paid_at, created_at, hosted_invoice_url, invoice_pdf_url",
    )
    .eq("user_id", viewer.user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AccountSection title={t("invoices")} description={t("invoicesDescription")}>
      {!invoices?.length ? (
        <EmptyState title={t("noInvoices")} icon={ReceiptIcon} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoiceNumber")}</TableHead>
              <TableHead>{t("invoiceDate")}</TableHead>
              <TableHead>{t("invoiceAmount")}</TableHead>
              <TableHead>{t("invoiceStatus")}</TableHead>
              <TableHead className="text-end">{t("invoiceDownload")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-xs">{invoice.number ?? "—"}</TableCell>
                <TableCell>{formatDate(invoice.paid_at ?? invoice.created_at, locale)}</TableCell>
                <TableCell>
                  {formatPrice(
                    invoice.amount_paid_cents || invoice.amount_due_cents,
                    invoice.currency,
                    locale,
                  )}
                  {invoice.amount_refunded_cents > 0 && (
                    <span className="block text-xs text-muted-foreground">
                      Remboursé :{" "}
                      {formatPrice(invoice.amount_refunded_cents, invoice.currency, locale)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      invoice.status === "paid"
                        ? "success"
                        : invoice.status === "open"
                          ? "warning"
                          : "muted"
                    }
                  >
                    {t.has(`invoiceStatuses.${invoice.status}`)
                      ? t(`invoiceStatuses.${invoice.status}`)
                      : invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-end">
                  {invoice.invoice_pdf_url || invoice.hosted_invoice_url ? (
                    <a
                      href={invoice.invoice_pdf_url ?? invoice.hosted_invoice_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary-text hover:underline"
                    >
                      <DownloadIcon className="size-4" /> PDF
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AccountSection>
  );
}

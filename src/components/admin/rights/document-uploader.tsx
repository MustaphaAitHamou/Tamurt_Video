"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUpIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createLicenseDocumentUploadAction,
  getLicenseDocumentUrlAction,
  registerLicenseDocumentAction,
} from "@/actions/admin/rights";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DOCUMENT_TYPE_LABELS } from "@/components/admin/rights/labels";
import { publicEnv } from "@/lib/public-env";

/** Envoi direct vers le stockage privé via une URL signée à usage unique. */
export function DocumentUploader({ licenseId }: { licenseId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("contract");
  const [pending, startTransition] = useTransition();
  const upload = () =>
    startTransition(async () => {
      if (!file) return;
      const mimeType = file.type || "application/octet-stream";
      const prepared = await createLicenseDocumentUploadAction({
        licenseId,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
      });
      if (!prepared.ok) {
        toast.error(prepared.error);
        return;
      }
      const response = await fetch(prepared.data.signedUrl, {
        method: "PUT",
        headers: {
          "content-type": mimeType,
          "x-upsert": "false",
          apikey: publicEnv.supabasePublishableKey,
        },
        body: file,
      }).catch(() => null);
      if (!response?.ok) {
        toast.error("Le fichier n'a pas pu être envoyé.");
        return;
      }
      const registered = await registerLicenseDocumentAction({
        licenseId,
        path: prepared.data.path,
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        documentType: type,
      });
      if (registered.ok) {
        toast.success(registered.message ?? "Justificatif archivé.");
        setFile(null);
      } else toast.error(registered.error);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-4">
      <label className="space-y-1 text-sm">
        <span className="block text-xs text-muted-foreground">Type</span>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="w-48">
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <input
        type="file"
        accept="application/pdf,image/jpeg,image/png,.doc,.docx"
        aria-label="Justificatif"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block max-w-xs text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground"
      />
      <Button size="sm" onClick={upload} disabled={!file || pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />} Archiver
      </Button>
    </div>
  );
}

export function DocumentLink({
  documentId,
  children,
}: {
  documentId: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="text-start font-medium hover:underline disabled:opacity-60"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await getLicenseDocumentUrlAction(documentId);
          // Le lien signé force le téléchargement (Content-Disposition) : la page reste affichée.
          if (result.ok) window.location.assign(result.data.url);
          else toast.error(result.error);
        })
      }
    >
      {children}
    </button>
  );
}

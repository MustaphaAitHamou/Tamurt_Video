"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloudIcon } from "lucide-react";
import { toast } from "sonner";

import {
  attachDevMediaAction,
  createVideoUploadAction,
  refreshMediaStatusAction,
} from "@/actions/admin/media";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const CHUNK_SIZE = 50 * 1024 * 1024; // multiple de 256 Kio, conforme aux exigences tus de Cloudflare

/** Envoi tus minimal : PATCH successifs, reprise à partir de l'offset annoncé par le serveur. */
async function tusUpload(url: string, file: File, onProgress: (ratio: number) => void) {
  let offset = 0;
  let retries = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
      },
      body: chunk,
    }).catch(() => null);
    if (!response || !response.ok) {
      if (retries++ >= 5) throw new Error("Envoi interrompu.");
      const head = await fetch(url, {
        method: "HEAD",
        headers: { "Tus-Resumable": "1.0.0" },
      }).catch(() => null);
      offset = Number(head?.headers.get("Upload-Offset") ?? offset);
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      continue;
    }
    retries = 0;
    offset = Number(response.headers.get("Upload-Offset") ?? offset + chunk.size);
    onProgress(offset / file.size);
  }
}

export function VideoUploader({
  titleId,
  episodeId,
  kind,
  devFolders,
}: {
  titleId: string;
  episodeId: string | null;
  kind: "main" | "trailer";
  devFolders: string[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [attestation, setAttestation] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      if (!file) return;
      const prepared = await createVideoUploadAction({
        titleId,
        episodeId,
        kind,
        fileName: file.name,
        sizeBytes: file.size,
        attestation,
      });
      if (!prepared.ok) {
        toast.error(prepared.error);
        return;
      }
      try {
        setProgress(0);
        await tusUpload(prepared.data.uploadUrl, file, setProgress);
        toast.success("Vidéo envoyée : traitement en cours chez le service vidéo.");
        await refreshMediaStatusAction(prepared.data.assetId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Envoi impossible.");
      } finally {
        setProgress(null);
        router.refresh();
      }
    });

  return (
    <div className="space-y-3 rounded-xl border border-dashed p-4">
      {devFolders.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Média de test (développement) :</span>
          {devFolders.map((folder) => (
            <Button
              key={folder}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await attachDevMediaAction({ titleId, episodeId, kind, folder });
                  if (result.ok) toast.success(result.message);
                  else toast.error(result.error);
                  router.refresh();
                })
              }
            >
              {folder}
            </Button>
          ))}
        </div>
      ) : (
        <>
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground"
          />
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              checked={attestation}
              onChange={(event) => setAttestation(event.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            J&apos;atteste que Tamurt Vidéo dispose des droits de diffusion de ce fichier, couverts
            par une licence enregistrée. La simple possession d&apos;une copie ne vaut pas
            autorisation.
          </label>
          {progress !== null && (
            <Progress value={progress * 100} aria-label="Progression de l'envoi" />
          )}
          <Button size="sm" disabled={!file || !attestation || pending} onClick={start}>
            <UploadCloudIcon /> Importer la vidéo
          </Button>
        </>
      )}
    </div>
  );
}

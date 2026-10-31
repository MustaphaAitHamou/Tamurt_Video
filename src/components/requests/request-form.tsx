"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { createRequestAction } from "@/actions/requests";
import { Field, FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function RequestForm() {
  const t = useTranslations("requests");
  const ts = useTranslations("requests.statuses");
  const [state, action] = useActionState(createRequestAction, null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const similar = state?.ok ? state.data.similar : undefined;
  const createdId = state?.ok ? state.data.id : undefined;
  const existingId = !state?.ok ? state?.fieldErrors?.existing?.[0] : undefined;

  if (createdId) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Button asChild>
          <Link href={`/demandes/${createdId}`}>{t("history")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input ref={confirmRef} type="hidden" name="confirmed" value="0" />
      <TextField label={t("titleField")} name="title" required maxLength={200} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t("year")}
          name="releaseYear"
          type="number"
          min={1888}
          max={2100}
          inputMode="numeric"
        />
        <Field label={t("contentType")} name="contentType" required>
          <NativeSelect id="contentType" name="contentType" defaultValue="film">
            {(["film", "series", "documentary", "short", "show", "other"] as const).map((type) => (
              <option key={type} value={type}>
                {t(`contentTypes.${type}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <TextField label={t("country")} name="country" maxLength={80} />
        <TextField label={t("director")} name="director" maxLength={160} />
      </div>
      <Field label={t("comment")} name="comment">
        <Textarea id="comment" name="comment" maxLength={2000} />
      </Field>
      <TextField
        label={t("infoUrl")}
        name="infoUrl"
        type="url"
        placeholder="https://"
        maxLength={500}
      />

      {similar && similar.length > 0 && (
        <div className="space-y-3 rounded-xl border border-gold/40 bg-gold/10 p-4" role="status">
          <p className="text-sm font-medium text-gold">{t("similarFound")}</p>
          <ul className="space-y-2">
            {similar.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>
                  {s.title}
                  {s.releaseYear ? ` (${s.releaseYear})` : ""} — {ts(s.status as "received")} ·{" "}
                  {t("votes", { count: s.votes })}
                </span>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/demandes/${s.id}`}>{t("voteInstead")}</Link>
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirmRef.current) confirmRef.current.value = "1";
              formRef.current?.requestSubmit();
            }}
          >
            {t("submit")} quand même
          </Button>
        </div>
      )}
      {existingId && (
        <p className="text-sm">
          <Link
            href={`/demandes/${existingId}`}
            className="text-primary underline underline-offset-4"
          >
            {t("voteInstead")}
          </Link>
        </p>
      )}
      {!similar && <FormMessage state={state} />}
      <p className="text-xs leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
      <SubmitButton>{t("submit")}</SubmitButton>
    </form>
  );
}

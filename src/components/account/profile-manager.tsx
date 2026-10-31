"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createProfileAction,
  deleteProfileAction,
  switchProfileAction,
  updateProfileAction,
} from "@/actions/profiles";
import { ProfileAvatar } from "@/components/account/profile-avatar";
import { FormMessage, SubmitButton, TextField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AVATARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  name: string;
  avatarKey: string;
  isKids: boolean;
  maxAgeRating: number | null;
  isDefault: boolean;
};

function ProfileFormFields({ profile }: { profile?: Profile }) {
  const t = useTranslations("account");
  const [avatar, setAvatar] = useState(profile?.avatarKey ?? "ochre");
  return (
    <>
      <TextField
        label={t("profileName")}
        name="name"
        defaultValue={profile?.name}
        required
        maxLength={30}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("avatar")}</legend>
        <input type="hidden" name="avatarKey" value={avatar} />
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => setAvatar(a.key)}
              aria-pressed={avatar === a.key}
              aria-label={a.label}
              className={cn(
                "cursor-pointer rounded-xl p-0.5 ring-2 ring-transparent transition",
                avatar === a.key && "ring-primary",
              )}
            >
              <ProfileAvatar avatarKey={a.key} className="size-11" />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="isKids"
          defaultChecked={profile?.isKids}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          {t("kidsProfile")}
          <span className="block text-xs text-muted-foreground">{t("kidsProfileHint")}</span>
        </span>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium">{t("maxAgeRating")}</span>
        <select
          name="maxAgeRating"
          defaultValue={
            profile?.maxAgeRating === null || profile?.maxAgeRating === undefined
              ? ""
              : String(profile.maxAgeRating)
          }
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm [&>option]:bg-popover"
        >
          <option value="">Aucune restriction</option>
          <option value="0">Tous publics</option>
          <option value="10">-10 ans</option>
          <option value="12">-12 ans</option>
          <option value="16">-16 ans</option>
          <option value="18">-18 ans</option>
        </select>
      </label>
    </>
  );
}

function CreateProfileDialog() {
  const t = useTranslations("account");
  const [state, action] = useActionState(createProfileAction, null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group flex cursor-pointer flex-col items-center gap-3">
          <span className="flex size-28 items-center justify-center rounded-2xl border-2 border-dashed border-white/25 text-white/50 transition group-hover:border-white/60 group-hover:text-white sm:size-32">
            <PlusIcon className="size-10" />
          </span>
          <span className="text-sm text-muted-foreground group-hover:text-foreground">
            {t("addProfile")}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addProfile")}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <ProfileFormFields />
          <FormMessage state={state} />
          <SubmitButton>{t("addProfile")}</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({ profile }: { profile: Profile }) {
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState(updateProfileAction.bind(null, profile.id), null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`${tc("edit")} ${profile.name}`}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{profile.name}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <ProfileFormFields profile={profile} />
          <FormMessage state={state} />
          <div className="flex justify-between gap-3">
            <SubmitButton>{tc("save")}</SubmitButton>
            {!profile.isDefault && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteProfileAction(profile.id);
                    if (!result.ok) toast.error(result.error);
                    router.refresh();
                  })
                }
              >
                <Trash2Icon /> {tc("delete")}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileManager({
  profiles,
  activeId,
  maxProfiles,
}: {
  profiles: Profile[];
  activeId: string;
  maxProfiles: number;
}) {
  const t = useTranslations("account");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-10 text-center">
      <ul className="flex flex-wrap justify-center gap-8">
        {profiles.map((profile) => (
          <li key={profile.id} className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await switchProfileAction(profile.id);
                  router.push("/");
                  router.refresh();
                })
              }
              className={cn(
                "cursor-pointer rounded-2xl ring-4 ring-transparent transition hover:scale-105 hover:ring-white/70 focus-visible:ring-white",
                profile.id === activeId && "ring-primary",
              )}
              aria-label={profile.name}
            >
              <ProfileAvatar
                avatarKey={profile.avatarKey}
                name={profile.name}
                className="size-28 text-5xl sm:size-32"
              />
            </button>
            <span className="flex items-center gap-1 text-sm font-medium">
              {profile.name}
              {profile.isKids && (
                <span className="rounded bg-white/15 px-1.5 text-[10px] uppercase">Enfant</span>
              )}
              <EditProfileDialog profile={profile} />
            </span>
          </li>
        ))}
        {profiles.length < maxProfiles && (
          <li>
            <CreateProfileDialog />
          </li>
        )}
      </ul>
      <p className="text-sm text-muted-foreground">{t("profileLimit", { count: maxProfiles })}</p>
    </div>
  );
}

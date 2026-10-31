import { AVATARS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Avatar de profil : dégradé et symbole inspirés des motifs amazighs. */
export function ProfileAvatar({
  avatarKey,
  name,
  className,
}: {
  avatarKey: string;
  name?: string;
  className?: string;
}) {
  const avatar = AVATARS.find((a) => a.key === avatarKey) ?? AVATARS[0];
  return (
    <span
      role="img"
      aria-label={name ? `Avatar de ${name}` : avatar.label}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg font-tifinagh text-lg text-white/90 shadow-inner",
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})` }}
    >
      <span aria-hidden className="drop-shadow-sm">
        {avatar.symbol}
      </span>
    </span>
  );
}

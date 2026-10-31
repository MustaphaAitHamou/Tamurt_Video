import { useTranslations } from "next-intl";
import { CrownIcon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ageRatingLabel } from "@/lib/format";
import type { TitleCardData } from "@/server/catalog/types";

export function AgeRatingBadge({ rating }: { rating: number }) {
  const t = useTranslations("title");
  return (
    <span
      title={rating > 0 ? t("ageRatingHint", { age: rating }) : undefined}
      className="inline-flex h-5 items-center rounded border border-white/30 px-1.5 text-[11px] font-semibold text-white/80"
    >
      {rating === 0 ? t("allAges") : ageRatingLabel(rating)}
    </span>
  );
}

export function TitleBadges({
  title,
  compact = false,
}: {
  title: TitleCardData;
  compact?: boolean;
}) {
  const t = useTranslations("common");
  const tt = useTranslations("title");
  const tiers = useTranslations("tiers");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {title.isDemo && (
        <Badge variant="muted" title={t("demoTooltip")} className="bg-black/60 backdrop-blur">
          {t("demo")}
        </Badge>
      )}
      {title.status === "announced" && <Badge variant="gold">{tt("comingSoon")}</Badge>}
      {title.isOriginal && !compact && (
        <Badge variant="default" className="gap-1">
          <SparklesIcon /> Tamurt
        </Badge>
      )}
      {title.minTier === "premium" && !compact && (
        <Badge variant="gold" className="gap-1">
          <CrownIcon /> {tiers("premium")}
        </Badge>
      )}
      {title.minTier === "free" && !compact && <Badge variant="success">{tiers("free")}</Badge>}
    </div>
  );
}

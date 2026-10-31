/**
 * Données de démonstration LOCALES : comptes de test, catalogue fictif,
 * licences de test, sous-titres, contenus éditoriaux.
 *
 * Sécurité : refuse de s'exécuter sur une instance Supabase non locale
 * (les comptes de démonstration ont un mot de passe connu), sauf option
 * explicite --allow-remote destinée à une préproduction isolée.
 *
 * Usage : pnpm seed:demo   (après pnpm db:reset)
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types.ts";
import { DEMO_PEOPLE, DEMO_TITLES, type DemoTitle } from "./demo/catalog.mts";

const root = path.resolve(import.meta.dirname, "..");
for (const file of [".env.local", ".env"]) {
  const full = path.join(root, file);
  if (existsSync(full)) process.loadEnvFile(full);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requis (voir .env.example).");
  process.exit(1);
}
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|host\.docker\.internal)(:\d+)?/.test(url);
if (!isLocal && !process.argv.includes("--allow-remote")) {
  console.error(
    `Refus : ${url} n'est pas une instance locale. Les comptes de démonstration ne doivent jamais exister en production.`,
  );
  process.exit(1);
}

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export const DEMO_PASSWORD = "Tamurt-Demo-2026";
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

/** Attend une requête et lève une erreur explicite en cas d'échec. */
async function must<T>(
  label: string,
  promise: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  const { data, error } = await promise;
  if (error) throw new Error(`${label} : ${error.message}`);
  return data as NonNullable<T>;
}

// ---------------------------------------------------------------------------
// Comptes de démonstration
// ---------------------------------------------------------------------------
type DemoUser = {
  email: string;
  name: string;
  roles?: Database["public"]["Enums"]["app_role"][];
  plan?: "founder" | "standard" | "premium";
};
const USERS: DemoUser[] = [
  { email: "admin@tamurt.test", name: "Admin Démo", roles: ["admin"], plan: "premium" },
  { email: "editeur@tamurt.test", name: "Éditrice Démo", roles: ["catalog_editor"] },
  { email: "droits@tamurt.test", name: "Gestionnaire Droits Démo", roles: ["rights_manager"] },
  { email: "fondateur@tamurt.test", name: "Fondateur Démo", plan: "founder" },
  { email: "standard@tamurt.test", name: "Abonnée Standard Démo", plan: "standard" },
  { email: "premium@tamurt.test", name: "Abonné Premium Démo", plan: "premium" },
  { email: "membre@tamurt.test", name: "Membre Gratuit Démo" },
];

async function ensureUser(user: DemoUser): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email === user.email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: user.name, locale: "fr", terms_version: "demo" },
  });
  if (error || !data.user) throw new Error(`Création de ${user.email} : ${error?.message}`);
  return data.user.id;
}

async function seedUsers() {
  const plans = await must(
    "formules",
    db.from("subscription_plans").select("id, code, price_cents, currency"),
  );
  const prices = await must(
    "prix",
    db.from("plan_prices").select("id, plan_id").eq("is_current", true),
  );
  const ids: Record<string, string> = {};
  for (const user of USERS) {
    const id = await ensureUser(user);
    ids[user.email] = id;
    for (const role of user.roles ?? []) {
      await db
        .from("user_roles")
        .upsert({ user_id: id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    }
    if (user.plan) {
      const plan = plans.find((p) => p.code === user.plan);
      if (!plan) continue;
      const { count } = await db
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id)
        .eq("provider", "manual")
        .eq("status", "active");
      if (!count) {
        await must(
          `abonnement ${user.email}`,
          db.from("subscriptions").insert({
            user_id: id,
            plan_id: plan.id,
            plan_price_id: prices.find((p) => p.plan_id === plan.id)?.id ?? null,
            provider: "manual",
            status: "active",
            unit_amount_cents: plan.price_cents,
            currency: plan.currency,
            current_period_start: iso(-20),
            current_period_end: iso(10),
            is_founder_rate: user.plan === "founder",
            note: "Abonnement de démonstration (aucun paiement réel).",
          }),
        );
      }
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Catalogue fictif
// ---------------------------------------------------------------------------
function devDuration(asset: string, fallback: number) {
  const info = path.join(root, "dev-media", asset, "info.json");
  if (existsSync(info)) {
    return (JSON.parse(readFileSync(info, "utf8")) as { duration: number }).duration;
  }
  return fallback;
}

function vtt(lang: "fr" | "en" | "ar", duration: number) {
  const lines = {
    fr: [
      "Sous-titres de démonstration.",
      "Œuvre fictive créée pour tester la plateforme.",
      "Tamurt Vidéo — média de test synthétique.",
    ],
    en: [
      "Demo subtitles.",
      "Fictional work created to test the platform.",
      "Tamurt Vidéo — synthetic test media.",
    ],
    ar: [
      "ترجمة تجريبية.",
      "عمل خيالي أُنشئ لاختبار المنصة.",
      "تامورت فيديو — وسائط اختبار اصطناعية.",
    ],
  }[lang];
  const pad = (n: number) => n.toString().padStart(2, "0");
  const ts = (s: number) =>
    `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}.000`;
  let out = "WEBVTT\n\n";
  for (let start = 2, i = 0; start < duration - 2; start += 6, i++) {
    out += `${i + 1}\n${ts(start)} --> ${ts(Math.min(start + 4, duration))}\n${lines[i % lines.length]}\n\n`;
  }
  return out;
}

async function uploadSubtitles(assetId: string, duration: number, createdBy: string) {
  const labels = { fr: "Français", en: "English", ar: "العربية" } as const;
  for (const lang of ["fr", "en", "ar"] as const) {
    const storagePath = `${assetId}/${lang}.vtt`;
    const { error } = await db.storage
      .from("subtitles")
      .upload(storagePath, new Blob([vtt(lang, duration)], { type: "text/vtt" }), {
        upsert: true,
        contentType: "text/vtt",
      });
    if (error) throw new Error(`Sous-titres ${storagePath} : ${error.message}`);
    await db.from("subtitles").upsert(
      {
        media_asset_id: assetId,
        language: lang,
        label: `${labels[lang]} (démo)`,
        kind: "subtitles",
        storage_path: storagePath,
        is_default: lang === "fr",
        created_by: createdBy,
      },
      { onConflict: "media_asset_id,language,kind" },
    );
  }
}

async function createAsset(input: {
  key: string;
  media: string;
  kind: "main" | "trailer";
  titleId: string;
  episodeId?: string;
  duration: number;
  createdBy: string;
}) {
  const providerAssetId = `${input.media}#${input.key}`;
  const existing = await db
    .from("media_assets")
    .select("id")
    .eq("provider", "dev_local")
    .eq("provider_asset_id", providerAssetId)
    .maybeSingle();
  if (existing.data) return existing.data.id;
  const row = await must(
    `média ${providerAssetId}`,
    db
      .from("media_assets")
      .insert({
        kind: input.kind,
        provider: "dev_local",
        provider_asset_id: providerAssetId,
        status: "ready",
        title_id: input.titleId,
        episode_id: input.episodeId ?? null,
        duration_seconds: input.duration,
        width: 1280,
        height: 720,
        qualities: ["360p", "720p"],
        original_filename: `${input.media}.m3u8`,
        rights_attestation: {
          type: "synthetic_test_media",
          note: "Média synthétique généré localement (scripts/generate-dev-media.sh).",
        },
        created_by: input.createdBy,
        ready_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
  );
  return row.id;
}

async function seedCatalog(adminId: string) {
  const genres = await must("genres", db.from("genres").select("id, slug"));
  const genreId = (slug: string) => genres.find((g) => g.slug === slug)?.id;

  // Personnes fictives
  const peopleIds: Record<string, string> = {};
  for (const [slug, fullName] of Object.entries(DEMO_PEOPLE)) {
    const row = await must(
      `personne ${slug}`,
      db
        .from("people")
        .upsert(
          { slug, full_name: fullName, is_demo: true, bio: "Personne fictive (démonstration)." },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
    );
    peopleIds[slug] = row.id;
  }

  // Ayants droit fictifs
  const holders = await Promise.all(
    [
      { name: "Tamurt Vidéo — productions de démonstration", kind: "producer" },
      { name: "Distribution Démo Atlas (fictif)", kind: "distributor" },
    ].map(async (h) => {
      const found = await db.from("rights_holders").select("id").eq("name", h.name).maybeSingle();
      if (found.data) return found.data.id;
      const row = await must(
        "ayant droit",
        db
          .from("rights_holders")
          .insert({
            ...h,
            country_code: "DZ",
            notes: "Ayant droit fictif (démonstration).",
            created_by: adminId,
          })
          .select("id")
          .single(),
      );
      return row.id;
    }),
  );

  const titleIds: Record<string, string> = {};
  for (const demo of DEMO_TITLES) {
    titleIds[demo.slug] = await seedTitle(demo, {
      adminId,
      peopleIds,
      genreId,
      holders: holders as [string, string],
    });
  }
  return titleIds;
}

async function seedTitle(
  demo: DemoTitle,
  ctx: {
    adminId: string;
    peopleIds: Record<string, string>;
    genreId: (slug: string) => number | undefined;
    holders: [string, string];
  },
) {
  const episodic = Boolean(demo.seasons);
  const title = await must(
    `œuvre ${demo.slug}`,
    db
      .from("titles")
      .upsert(
        {
          slug: demo.slug,
          kind: demo.kind,
          structure: episodic ? "episodic" : "single",
          title: demo.title,
          original_title: demo.originalTitle ?? null,
          tagline: demo.tagline,
          synopsis_short: demo.synopsis,
          description_long: demo.description,
          release_year: demo.year,
          countries: demo.countries,
          original_languages: demo.languages,
          audio_languages: demo.languages,
          runtime_minutes: demo.runtime,
          age_rating: demo.age,
          min_tier: demo.minTier,
          is_original: demo.original ?? false,
          is_featured: demo.featured ?? false,
          is_demo: true,
          tags: demo.tags ?? [],
          poster_path: `/demo/titles/${demo.slug}/poster.webp`,
          backdrop_path: `/demo/titles/${demo.slug}/backdrop.webp`,
          created_by: ctx.adminId,
        },
        { onConflict: "slug" },
      )
      .select("id, status")
      .single(),
  );
  const titleId = title.id;

  await db.from("title_genres").delete().eq("title_id", titleId);
  const genreRows = demo.genres
    .map((slug) => ({ title_id: titleId, genre_id: ctx.genreId(slug) }))
    .filter((r): r is { title_id: string; genre_id: number } => r.genre_id !== undefined);
  if (genreRows.length) await must("genres de l'œuvre", db.from("title_genres").insert(genreRows));

  await db.from("credits").delete().eq("title_id", titleId);
  await must(
    "crédits",
    db.from("credits").insert(
      demo.credits.map((c, index) => ({
        title_id: titleId,
        person_id: ctx.peopleIds[c.person] as string,
        role: c.role,
        character_name: c.character ?? null,
        position: index,
      })),
    ),
  );

  // Médias (fournisseur de développement)
  const mainDuration = devDuration(demo.media, demo.media === "demo-feature" ? 120 : 90);
  if (!episodic) {
    const assetId = await createAsset({
      key: demo.slug,
      media: demo.media,
      kind: "main",
      titleId,
      duration: mainDuration,
      createdBy: ctx.adminId,
    });
    await uploadSubtitles(assetId, mainDuration, ctx.adminId);
    await db
      .from("titles")
      .update({
        main_asset_id: assetId,
        intro_start_seconds: demo.kind === "film" ? 4 : null,
        intro_end_seconds: demo.kind === "film" ? 16 : null,
        credits_start_seconds: Math.max(mainDuration - 12, 10),
      })
      .eq("id", titleId);
  } else {
    for (const season of demo.seasons ?? []) {
      const seasonRow = await must(
        "saison",
        db
          .from("seasons")
          .upsert(
            { title_id: titleId, season_number: season.number, name: `Saison ${season.number}` },
            { onConflict: "title_id,season_number" },
          )
          .select("id")
          .single(),
      );
      for (const [index, episode] of season.episodes.entries()) {
        const number = index + 1;
        const episodeRow = await must(
          "épisode",
          db
            .from("episodes")
            .upsert(
              {
                title_id: titleId,
                season_id: seasonRow.id,
                episode_number: number,
                name: episode.name,
                synopsis: episode.synopsis,
                runtime_minutes: demo.runtime,
                still_path: `/demo/titles/${demo.slug}/backdrop.webp`,
                status: "published",
                published_at: iso(-30 + number),
              },
              { onConflict: "season_id,episode_number" },
            )
            .select("id")
            .single(),
        );
        const duration = devDuration(demo.media, 90);
        const assetId = await createAsset({
          key: `${demo.slug}-s${season.number}e${number}`,
          media: demo.media,
          kind: "main",
          titleId,
          episodeId: episodeRow.id,
          duration,
          createdBy: ctx.adminId,
        });
        if (number === 1) await uploadSubtitles(assetId, duration, ctx.adminId);
        await db
          .from("episodes")
          .update({
            main_asset_id: assetId,
            intro_start_seconds: 3,
            intro_end_seconds: 14,
            credits_start_seconds: Math.max(duration - 15, 10),
          })
          .eq("id", episodeRow.id);
      }
    }
  }

  if (demo.trailer) {
    const duration = devDuration("demo-trailer", 30);
    const trailerId = await createAsset({
      key: `${demo.slug}-trailer`,
      media: "demo-trailer",
      kind: "trailer",
      titleId,
      duration,
      createdBy: ctx.adminId,
    });
    await db.from("titles").update({ trailer_asset_id: trailerId }).eq("id", titleId);
  }

  // Licence de test (passe par la garde de publication en base)
  const reference = `DEMO-${demo.slug}`;
  const modes = demo.minTier === "free" ? ["free", "svod", "trailer"] : ["svod", "trailer"];
  const rights = demo.rights ?? "worldwide";
  const licenseInput: Database["public"]["Tables"]["licenses"]["Insert"] = {
    title_id: titleId,
    contract_reference: reference,
    exploitation_modes: modes,
    supports: ["web"],
    status: "signed",
    verified_by: ctx.adminId,
    verified_at: new Date().toISOString(),
    created_by: ctx.adminId,
    notes: "Licence de test pour une œuvre fictive.",
    ...(rights === "worldwide"
      ? {
          license_type: "owned_production",
          rights_holder_id: ctx.holders[0],
          starts_at: iso(-60),
          ends_at: null,
        }
      : rights === "upcoming"
        ? {
            license_type: "exclusive_license",
            rights_holder_id: ctx.holders[1],
            starts_at: iso(90),
            ends_at: iso(90 + 3 * 365),
          }
        : rights === "expired"
          ? {
              license_type: "non_exclusive_license",
              rights_holder_id: ctx.holders[1],
              starts_at: iso(-400),
              ends_at: iso(30),
            }
          : {
              license_type:
                rights === "france-only" ? "non_exclusive_license" : "exclusive_license",
              rights_holder_id: ctx.holders[1],
              starts_at: iso(-60),
              ends_at: iso(rights === "france-only" ? 365 : 730),
            }),
  };
  const existing = await db
    .from("licenses")
    .select("id")
    .eq("title_id", titleId)
    .eq("contract_reference", reference)
    .maybeSingle();
  let licenseId = existing.data?.id;
  if (!licenseId) {
    licenseId = (
      await must("licence", db.from("licenses").insert(licenseInput).select("id").single())
    ).id;
  } else {
    await must("licence", db.from("licenses").update(licenseInput).eq("id", licenseId));
  }
  await db.from("license_territories").delete().eq("license_id", licenseId);
  const territories =
    rights === "france-only"
      ? ["FR"]
      : rights === "maghreb-europe"
        ? ["DZ", "MA", "TN", "FR", "BE", "CH", "DE", "ES", "IT", "NL", "GB", "LU"]
        : ["WW"];
  await must(
    "territoires",
    db
      .from("license_territories")
      .insert(
        territories.map((country_code) => ({ license_id: licenseId as string, country_code })),
      ),
  );

  const targetStatus = demo.status ?? "published";
  if (title.status !== targetStatus) {
    await must(
      `publication ${demo.slug}`,
      db
        .from("titles")
        .update({
          status: targetStatus,
          published_at:
            targetStatus === "published" ? iso(-45 + DEMO_TITLES.indexOf(demo) * 3) : null,
        })
        .eq("id", titleId),
    );
  }

  // Popularité de démonstration (sera recalculée par la tâche planifiée à partir des vraies vues).
  const popularity =
    Math.round((DEMO_TITLES.length - DEMO_TITLES.indexOf(demo)) * 7.3 + (demo.featured ? 40 : 0)) %
    100;
  await db.from("titles").update({ popularity_score: popularity }).eq("id", titleId);

  // La licence « expirée » n'expire qu'après la publication : la lecture devient alors bloquée.
  if (rights === "expired") {
    await must(
      "expiration",
      db
        .from("licenses")
        .update({ ends_at: iso(-1) })
        .eq("id", licenseId),
    );
  }
  return titleId;
}

// ---------------------------------------------------------------------------
// Éditorial, demandes, progression
// ---------------------------------------------------------------------------
async function seedEditorial(titleIds: Record<string, string>, adminId: string) {
  const collection = await must(
    "collection",
    db.from("collections").select("id").eq("slug", "selection-tamurt").single(),
  );
  await db.from("collection_items").delete().eq("collection_id", collection.id);
  const picks = [
    "le-chant-de-lakfadou",
    "taddart",
    "tifinagh-lecriture-des-ancetres",
    "lettre-a-yemma",
    "les-voix-du-sahara",
    "le-fils-du-djurdjura",
  ];
  await must(
    "sélection",
    db.from("collection_items").insert(
      picks.map((slug, position) => ({
        collection_id: collection.id,
        title_id: titleIds[slug] as string,
        position,
      })),
    ),
  );

  await db.from("home_banners").delete().like("headline", "%");
  await must(
    "bannières",
    db.from("home_banners").insert(
      [
        {
          title_id: titleIds["le-chant-de-lakfadou"],
          headline: "Le Chant de l'Akfadou",
          subheadline:
            "Une voix s'élève de la forêt. Œuvre fictive présentée pour la démonstration de la plateforme.",
          position: 0,
        },
        {
          title_id: titleIds["taddart"],
          headline: "Taddart",
          subheadline:
            "La série du Ramadan : un village, mille secrets. Œuvre fictive de démonstration.",
          position: 1,
        },
        {
          title_id: titleIds["le-fils-du-djurdjura"],
          headline: "Le Fils du Djurdjura",
          subheadline:
            "En accès anticipé pour les membres Premium. Œuvre fictive de démonstration.",
          audience: "members",
          position: 2,
        },
      ],
      { defaultToNull: false },
    ),
  );

  await db.from("announcements").delete().like("slug", "%");
  await must(
    "actualités",
    db.from("announcements").insert(
      [
        {
          slug: "ouverture-de-la-phase-fondatrice",
          title: "Ouverture de la phase fondatrice",
          excerpt:
            "Tamurt Vidéo ouvre son abonnement de soutien à 2 € par mois pour financer la construction de la plateforme.",
          body: "## Pourquoi une phase fondatrice ?\n\nAvant de proposer un catalogue sous licence, il faut construire la plateforme, négocier les droits et financer les premières acquisitions.\n\nL'abonnement **Fondateur** permet de soutenir ce travail. Il ne donne pas accès à des films commerciaux tant que leurs droits n'ont pas été acquis : nous publierons chaque acquisition dans ces actualités.\n\n*Actualité de démonstration (environnement local).*",
          category: "launch",
          audience: "public",
          status: "published",
          published_at: iso(-10),
          pinned: true,
          created_by: adminId,
        },
        {
          slug: "comment-nous-choisissons-les-oeuvres",
          title: "Comment nous choisissons les œuvres du catalogue",
          excerpt:
            "Droits vérifiés, territoires couverts, sous-titres soignés : notre méthode de sélection.",
          body: "Chaque œuvre ajoutée au catalogue fait l'objet d'un contrat ou d'une vérification de ses droits : titulaire, territoires, durée et modes d'exploitation.\n\nLes demandes des membres Premium nous aident à prioriser les recherches d'ayants droit, sans promesse de disponibilité.\n\n*Actualité de démonstration (environnement local).*",
          category: "catalog",
          audience: "public",
          status: "published",
          published_at: iso(-6),
          created_by: adminId,
        },
        {
          slug: "merci-aux-premiers-fondateurs",
          title: "Merci aux premiers membres fondateurs",
          excerpt: "Un point d'étape réservé aux fondateurs sur l'utilisation des soutiens.",
          body: "Merci ! Ce message de démonstration est réservé aux membres fondateurs et illustre les annonces privées de l'espace fondateur.",
          category: "news",
          audience: "founders",
          status: "published",
          published_at: iso(-2),
          created_by: adminId,
        },
      ],
      { defaultToNull: false },
    ),
  );

  await db.from("roadmap_items").delete().like("title", "%");
  await must(
    "feuille de route",
    db.from("roadmap_items").insert([
      {
        title: "Plateforme web et espace membre",
        category: "platform",
        status: "done",
        progress: 100,
        position: 1,
        target_label: "2026",
      },
      {
        title: "Lecteur vidéo sécurisé multi-qualité",
        category: "platform",
        status: "in_progress",
        progress: 80,
        position: 2,
        target_label: "2026",
      },
      {
        title: "Ouverture des abonnements fondateur",
        category: "business",
        status: "in_progress",
        progress: 60,
        position: 3,
        target_label: "2026",
      },
      {
        title: "Premières acquisitions de droits",
        category: "catalog",
        status: "planned",
        progress: 10,
        position: 4,
        target_label: "2027",
      },
      {
        title: "Sous-titres kabyle, arabe et anglais validés",
        category: "catalog",
        status: "planned",
        progress: 15,
        position: 5,
        target_label: "2027",
      },
      {
        title: "Applications mobiles et TV",
        category: "apps",
        status: "planned",
        progress: 0,
        position: 6,
        target_label: "À définir",
      },
    ]),
  );
}

async function seedRequests(userIds: Record<string, string>) {
  const premium = userIds["premium@tamurt.test"];
  if (!premium) return;
  await db.from("content_requests").delete().like("title", "% (fictif)");
  const requests = [
    {
      title: "La Montagne aux sept sources (fictif)",
      release_year: 1998,
      country: "Algérie",
      content_type: "film" as const,
      comment: "Demande de démonstration.",
    },
    {
      title: "Les Chroniques de Tizi (fictif)",
      release_year: 2008,
      country: "Algérie",
      content_type: "series" as const,
      comment: "Demande de démonstration.",
    },
    {
      title: "Mémoires du Hoggar (fictif)",
      release_year: 2015,
      country: "Algérie",
      content_type: "documentary" as const,
      comment: "Demande de démonstration.",
    },
  ];
  for (const request of requests) {
    await must("demande", db.from("content_requests").insert({ ...request, user_id: premium }));
  }
}

async function main() {
  console.info(`Amorçage de démonstration sur ${url}`);
  const userIds = await seedUsers();
  const adminId = userIds["admin@tamurt.test"] as string;
  const titleIds = await seedCatalog(adminId);
  await seedEditorial(titleIds, adminId);
  await seedRequests(userIds);
  console.info("Terminé. Comptes de démonstration (mot de passe : %s) :", DEMO_PASSWORD);
  for (const user of USERS)
    console.info(
      `  - ${user.email}${user.roles ? ` [${user.roles.join(", ")}]` : ""}${user.plan ? ` (${user.plan})` : ""}`,
    );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

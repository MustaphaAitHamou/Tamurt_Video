import "server-only";

import { cache } from "react";

import { resolveImageUrl } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "planned" | "in_progress" | "done" | "paused";
  targetLabel: string | null;
  progress: number;
};

export type AnnouncementSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: Database["public"]["Enums"]["announcement_category"];
  audience: Database["public"]["Enums"]["content_audience"];
  coverUrl: string | null;
  publishedAt: string | null;
  pinned: boolean;
};

export const getRoadmap = cache(async (): Promise<RoadmapItem[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("roadmap_items")
    .select("id, title, description, category, status, target_label, progress")
    .eq("is_public", true)
    .order("position");
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    status: r.status as RoadmapItem["status"],
    targetLabel: r.target_label,
    progress: r.progress,
  }));
});

/** Actualités visibles par l'utilisateur courant (la RLS applique l'audience). */
export async function getAnnouncements(options: { limit?: number; category?: string } = {}): Promise<AnnouncementSummary[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("announcements")
    .select("id, slug, title, excerpt, category, audience, cover_path, published_at, pinned")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 20);
  if (options.category) {
    query = query.eq("category", options.category as Database["public"]["Enums"]["announcement_category"]);
  }
  const { data } = await query;
  return (data ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    audience: a.audience,
    coverUrl: resolveImageUrl(a.cover_path),
    publishedAt: a.published_at,
    pinned: a.pinned,
  }));
}

export async function getAnnouncement(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, slug, title, excerpt, body, category, audience, cover_path, published_at, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return { ...data, coverUrl: resolveImageUrl(data.cover_path) };
}

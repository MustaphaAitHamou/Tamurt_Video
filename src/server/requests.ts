import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type RequestStatus = Database["public"]["Enums"]["request_status"];

export type RequestSummary = {
  id: string;
  title: string;
  releaseYear: number | null;
  country: string | null;
  director: string | null;
  contentType: Database["public"]["Enums"]["request_content_type"];
  status: RequestStatus;
  votes: number;
  createdAt: string;
  isMine: boolean;
  hasVoted: boolean;
  publicNote: string | null;
  linkedTitleSlug: string | null;
};

export async function listRequests(options: {
  userId: string | null;
  sort: "top" | "recent";
  mine: boolean;
  limit?: number;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_requests")
    .select(
      "id, title, release_year, country, director, content_type, status, vote_count, created_at, user_id, public_note, titles(slug)",
    )
    .is("duplicate_of", null)
    .limit(options.limit ?? 100);
  if (options.mine && options.userId) query = query.eq("user_id", options.userId);
  else query = query.eq("is_hidden", false);
  query =
    options.sort === "top"
      ? query.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });
  const [{ data }, votes] = await Promise.all([
    query,
    options.userId
      ? supabase.from("content_request_votes").select("request_id").eq("user_id", options.userId)
      : Promise.resolve({ data: [] as { request_id: string }[] }),
  ]);
  const voted = new Set((votes.data ?? []).map((v) => v.request_id));
  return (data ?? []).map((r): RequestSummary => ({
    id: r.id,
    title: r.title,
    releaseYear: r.release_year,
    country: r.country,
    director: r.director,
    contentType: r.content_type,
    status: r.status,
    votes: r.vote_count,
    createdAt: r.created_at,
    isMine: r.user_id === options.userId,
    hasVoted: voted.has(r.id),
    publicNote: r.public_note,
    linkedTitleSlug: (r.titles as { slug: string } | null)?.slug ?? null,
  }));
}

export async function getRequest(id: string, userId: string | null) {
  const supabase = await createSupabaseServerClient();
  const [{ data: request }, { data: events }, vote] = await Promise.all([
    supabase
      .from("content_requests")
      .select(
        "id, title, release_year, country, director, content_type, comment, info_url, status, vote_count, created_at, user_id, public_note, titles(slug, title)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("content_request_events")
      .select("id, from_status, to_status, public_note, created_at")
      .eq("request_id", id)
      .order("created_at"),
    userId
      ? supabase
          .from("content_request_votes")
          .select("request_id")
          .eq("request_id", id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!request) return null;
  return { request, events: events ?? [], hasVoted: Boolean(vote.data) };
}

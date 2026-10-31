"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type Hls from "hls.js";
import {
  ArrowLeftIcon,
  CaptionsIcon,
  ListVideoIcon,
  Loader2Icon,
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PictureInPicture2Icon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SettingsIcon,
  SkipForwardIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlaybackDenied, PlaybackGranted } from "@/server/playback/service";

type EpisodeOption = { id: string; label: string; name: string };

export type VideoPlayerProps = {
  titleId: string;
  episodeId: string | null;
  kind: "main" | "trailer";
  slug: string;
  heading: string;
  subheading: string | null;
  backHref: string;
  posterUrl: string | null;
  episodes: EpisodeOption[];
  signInHref: string;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_CAP: Record<string, number> = { sd: 480, hd: 720, fhd: 1080, uhd: 2160 };
const HEARTBEAT_MS = 15_000;
const CONTROLS_HIDE_MS = 3000;
const AUTOPLAY_SECONDS = 10;

function qualityLabel(height: number) {
  if (height >= 2160) return "4K";
  if (height >= 1080) return "1080p Full HD";
  if (height >= 720) return "720p HD";
  return `${height}p`;
}

export function VideoPlayer(props: VideoPlayerProps) {
  const { titleId, episodeId, kind, slug } = props;
  const t = useTranslations("player");
  const tTiers = useTranslations("tiers");
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement | null>(null);
  // Élément conteneur des menus : en plein écran, seuls ses descendants sont visibles.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setPortalContainer(node);
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const playedRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);
  const sessionRef = useRef<PlaybackGranted | null>(null);
  // Une seule demande par tentative, même si l'effet est rejoué (mode strict de React).
  const inflightRef = useRef<{ key: string; promise: Promise<PlaybackGranted | PlaybackDenied> } | null>(null);

  const [session, setSession] = useState<PlaybackGranted | null>(null);
  const [denied, setDenied] = useState<PlaybackDenied | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [level, setLevel] = useState(-1);
  const [currentHeight, setCurrentHeight] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const [subtitle, setSubtitle] = useState<string>("off");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);
  const [nextDismissed, setNextDismissed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const requestSession = useCallback(
    async (sessionId?: string | null) => {
      const response = await fetch("/api/playback/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId, episodeId, kind, sessionId: sessionId ?? null }),
      });
      return (await response.json().catch(() => ({ ok: false, reason: "provider_unavailable", requiredTier: null }))) as
        | PlaybackGranted
        | PlaybackDenied;
    },
    [titleId, episodeId, kind],
  );

  // Demande initiale d'autorisation de lecture.
  useEffect(() => {
    let cancelled = false;
    const key = `${titleId}:${episodeId ?? ""}:${kind}:${attempt}`;
    if (inflightRef.current?.key !== key) {
      inflightRef.current = { key, promise: requestSession() };
    }
    inflightRef.current.promise.then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSession(result);
        if (result.preferredSubtitle && result.subtitles.some((s) => s.language === result.preferredSubtitle)) {
          setSubtitle(result.preferredSubtitle);
        }
      } else {
        setDenied(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [requestSession, attempt, titleId, episodeId, kind]);

  // Nouvelle tentative : l'état est réinitialisé ici (le composant est remonté à chaque changement d'œuvre).
  const retry = () => {
    setSession(null);
    setDenied(null);
    setFatalError(null);
    setBuffering(true);
    setAttempt((value) => value + 1);
  };

  // Envoi de la progression (fetch keepalive, sendBeacon à la fermeture).
  const report = useCallback((event: "heartbeat" | "pause" | "seek" | "ended" | "stop") => {
    const current = sessionRef.current;
    const video = videoRef.current;
    if (!current?.sessionId || !video) return;
    const delta = Math.floor(playedRef.current);
    playedRef.current -= delta;
    const body = JSON.stringify({
      sessionId: current.sessionId,
      position: Math.floor(video.currentTime || 0),
      duration: Number.isFinite(video.duration) ? Math.floor(video.duration) : null,
      delta,
      event,
    });
    if (event === "stop" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/playback/progress", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/playback/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  // Renouvellement de l'autorisation (jeton expiré) sans perdre la position.
  const refreshGrant = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setNotice(t("errors.tokenExpired"));
    pendingSeekRef.current = videoRef.current?.currentTime ?? null;
    const result = await requestSession(sessionRef.current?.sessionId);
    refreshingRef.current = false;
    if (result.ok) {
      setSession(result);
      setNotice(null);
    } else {
      setDenied(result);
    }
  }, [requestSession, t]);

  // Attache la source HLS (hls.js, ou HLS natif sur Safari / iOS).
  useEffect(() => {
    const video = videoRef.current;
    if (!session || !video) return;
    let destroyed = false;
    let networkRetries = 0;

    (async () => {
      const { default: HlsClass } = await import("hls.js");
      if (destroyed) return;
      if (HlsClass.isSupported()) {
        const drmSystems = session.drm
          ? Object.fromEntries(
              session.drm.map((d) => [
                d.system === "widevine" ? "com.widevine.alpha" : d.system === "playready" ? "com.microsoft.playready" : "com.apple.fps",
                { licenseUrl: d.licenseUrl, serverCertificateUrl: d.certificateUrl },
              ]),
            )
          : undefined;
        const hls = new HlsClass({
          enableWorker: true,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          backBufferLength: 60,
          ...(drmSystems ? { emeEnabled: true, drmSystems } : {}),
        });
        hlsRef.current = hls;
        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          const cap = QUALITY_CAP[session.maxQuality] ?? 1080;
          const allowed = hls.levels
            .map((l, index) => ({ index, height: l.height }))
            .filter((l) => !l.height || l.height <= cap)
            .sort((a, b) => b.height - a.height);
          setLevels(allowed);
          if (allowed.length) hls.autoLevelCapping = Math.max(...allowed.map((l) => l.index));
        });
        hls.on(HlsClass.Events.LEVEL_SWITCHED, (_event, data) => setCurrentHeight(hls.levels[data.level]?.height ?? null));
        hls.on(HlsClass.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
            const code = data.response?.code;
            if (code === 401 || code === 403) {
              void refreshGrant();
              return;
            }
            if (networkRetries < 4) {
              networkRetries += 1;
              setNotice(t("errors.network"));
              setTimeout(() => hls.startLoad(), 1000 * 2 ** networkRetries);
              return;
            }
          } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          setFatalError(t("errors.fatal"));
        });
        hls.on(HlsClass.Events.FRAG_LOADED, () => {
          networkRetries = 0;
          setNotice((value) => (value === t("errors.network") ? null : value));
        });
        hls.loadSource(session.manifestUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = session.manifestUrl;
      } else {
        setFatalError(t("errors.unsupported"));
      }
    })();

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [session, refreshGrant, t]);

  // Sous-titres : un seul suivi actif à la fois.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = Array.from(video.textTracks);
    for (const track of tracks) {
      track.mode = track.language === subtitle ? "showing" : "disabled";
    }
  }, [subtitle, session]);

  // Signal périodique pendant la lecture, et à la fermeture de la page.
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => report("heartbeat"), HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [playing, report]);

  useEffect(() => {
    const onHide = () => report("stop");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("pause");
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      report("stop");
    };
  }, [report]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    lastTimeRef.current = null;
    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration || Infinity);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else if (container?.requestFullscreen) {
      await container.requestFullscreen().catch(() => undefined);
    } else {
      video?.webkitEnterFullscreen?.();
    }
  }, []);

  const goToEpisode = useCallback(
    (id: string) => {
      report("stop");
      router.push(`/regarder/${slug}?episode=${id}`);
    },
    [report, router, slug],
  );

  // Raccourcis clavier (actifs quand le lecteur a le focus).
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[role=menu], [role=slider], input, button")) {
      if (event.key !== " " || (event.target as HTMLElement).tagName === "BUTTON") return;
    }
    const video = videoRef.current;
    if (!video) return;
    switch (event.key) {
      case " ":
      case "k":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
      case "j":
        event.preventDefault();
        seekBy(-10);
        break;
      case "ArrowRight":
      case "l":
        event.preventDefault();
        seekBy(10);
        break;
      case "ArrowUp":
        event.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;
      case "ArrowDown":
        event.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;
      case "m":
        video.muted = !video.muted;
        break;
      case "f":
        void toggleFullscreen();
        break;
      case "c":
        if (session?.subtitles.length) {
          setSubtitle((current) => (current === "off" ? (session.subtitles.find((s) => s.isDefault) ?? session.subtitles[0])?.language ?? "off" : "off"));
        }
        break;
    }
    showControls();
  };

  const inIntro = Boolean(session?.intro && time >= session.intro.start && time < session.intro.end - 1);
  const creditsReached = Boolean(
    session?.nextEpisode && ((session.creditsStartSeconds !== null && time >= session.creditsStartSeconds) || (duration > 0 && time >= duration - 0.5)),
  );
  const showNextCard = creditsReached && !nextDismissed;

  const countdownActive = showNextCard && Boolean(session?.autoplayNext);
  const playNextEpisode = useCallback(() => {
    const next = sessionRef.current?.nextEpisode;
    if (next) goToEpisode(next.id);
  }, [goToEpisode]);

  const progressPercent = duration > 0 ? (time / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;

  const deniedAction = useMemo(() => {
    if (!denied) return null;
    switch (denied.reason) {
      case "login_required":
        return { href: props.signInHref, label: t("reasons.login_required") };
      case "subscription_required":
      case "mode_not_covered":
        return { href: "/offres", label: tTiers(denied.requiredTier ?? "standard") };
      case "too_many_streams":
        return { href: "/compte/securite", label: t("settings") };
      default:
        return null;
    }
  }, [denied, props.signInHref, t, tTiers]);

  return (
    <div
      ref={attachContainer}
      className={cn("relative h-dvh w-full overflow-hidden bg-black text-white outline-none select-none", !controlsVisible && playing && "cursor-none")}
      onMouseMove={showControls}
      onTouchStart={showControls}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-label={props.heading}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-contain"
        poster={props.posterUrl ?? undefined}
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(event) => event.preventDefault()}
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
        onPlay={() => {
          setPlaying(true);
          showControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
          report("pause");
        }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(video.duration);
          const pending = pendingSeekRef.current;
          pendingSeekRef.current = null;
          if (pending !== null) {
            video.currentTime = pending;
          } else if (session && session.resumePositionSeconds > 5) {
            video.currentTime = session.resumePositionSeconds;
            setResumeFrom(session.resumePositionSeconds);
            setTimeout(() => setResumeFrom(null), 7000);
          }
          video.playbackRate = rate;
          void video.play().catch(() => setBuffering(false));
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const current = video.currentTime;
          if (lastTimeRef.current !== null && !video.paused) {
            const delta = current - lastTimeRef.current;
            if (delta > 0 && delta < 2) playedRef.current += delta;
          }
          lastTimeRef.current = current;
          setTime(current);
          if (video.buffered.length) setBufferedEnd(video.buffered.end(video.buffered.length - 1));
        }}
        onSeeking={() => {
          lastTimeRef.current = null;
        }}
        onSeeked={() => report("seek")}
        onEnded={() => report("ended")}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        onRateChange={(event) => setRate(event.currentTarget.playbackRate)}
      >
        {session?.subtitles.map((track) => (
          <track key={track.id} kind={track.kind === "captions" ? "captions" : "subtitles"} src={track.url} srcLang={track.language} label={track.label} />
        ))}
      </video>

      {/* Chargement / mise en mémoire tampon */}
      {!denied && !fatalError && (buffering || !session) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
          <Loader2Icon className="size-12 animate-spin text-white/80" />
          <span className="text-sm text-white/70">{session ? t("buffering") : t("loading")}</span>
        </div>
      )}

      {/* Refus d'accès ou erreur bloquante */}
      {(denied || fatalError) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
          <div className="max-w-md space-y-5 text-center" role="alert">
            <p className="font-display text-2xl font-semibold">
              {denied
                ? t.has(`reasons.${denied.reason}`)
                  ? t(`reasons.${denied.reason}` as "reasons.not_found", { plan: tTiers(denied.requiredTier ?? "standard") })
                  : t("errors.fatal")
                : fatalError}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {deniedAction && (
                <Button asChild>
                  <Link href={deniedAction.href}>{deniedAction.label}</Link>
                </Button>
              )}
              {(fatalError || denied?.reason === "too_many_streams" || denied?.reason === "provider_unavailable" || denied?.reason === "rate_limited") && (
                <Button variant="secondary" onClick={retry}>
                  {t("play")}
                </Button>
              )}
              <Button asChild variant="ghost">
                <Link href={props.backHref}>{t("back")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages transitoires */}
      {(notice || resumeFrom !== null) && !denied && (
        <div className="absolute top-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/70 px-4 py-2 text-sm backdrop-blur" role="status" aria-live="polite">
          {notice ?? t("resumeFrom", { time: formatClock(resumeFrom ?? 0) })}
          {resumeFrom !== null && !notice && (
            <button
              type="button"
              className="cursor-pointer font-semibold text-primary"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setResumeFrom(null);
              }}
            >
              {t("restart")}
            </button>
          )}
        </div>
      )}

      {session?.provider === "dev_local" && controlsVisible && (
        <p className="absolute top-20 end-4 z-20 rounded-full bg-warning/90 px-3 py-1 text-xs font-medium text-black">{t("devProvider")}</p>
      )}

      {/* Passer l'introduction */}
      {inIntro && session?.intro && (
        <Button
          variant="light"
          size="lg"
          className="absolute end-6 bottom-28 z-20 sm:end-10"
          onClick={() => {
            if (videoRef.current && session.intro) videoRef.current.currentTime = session.intro.end;
          }}
        >
          <SkipForwardIcon /> {t("skipIntro")}
        </Button>
      )}

      {/* Épisode suivant */}
      {showNextCard && session?.nextEpisode && (
        <div className="absolute end-6 bottom-28 z-20 w-72 space-y-3 rounded-2xl border border-white/15 bg-black/80 p-4 backdrop-blur sm:end-10" role="status" aria-live="polite">
          <p className="text-xs tracking-wide text-white/60 uppercase">{t("nextEpisode")}</p>
          <p className="font-semibold">
            {session.nextEpisode.label} — {session.nextEpisode.name}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="light" onClick={() => session.nextEpisode && goToEpisode(session.nextEpisode.id)}>
              <PlayIcon className="fill-current" />
              {countdownActive ? (
                <Countdown seconds={AUTOPLAY_SECONDS} onComplete={playNextEpisode}>
                  {(remaining) => t("nextEpisodeIn", { seconds: remaining })}
                </Countdown>
              ) : (
                t("nextEpisode")
              )}
            </Button>
            {countdownActive && (
              <Button size="sm" variant="ghost" onClick={() => setNextDismissed(true)}>
                {t("cancelAutoplay")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Barre supérieure */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-10 flex items-center gap-4 bg-gradient-to-b from-black/80 to-transparent px-4 py-4 transition-opacity duration-300 sm:px-8",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Button asChild variant="ghost" size="icon" aria-label={t("back")} onClick={() => report("stop")}>
          <Link href={props.backHref}>
            <ArrowLeftIcon className="size-6 rtl:rotate-180" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{props.heading}</h1>
          {props.subheading && <p className="truncate text-sm text-white/70">{props.subheading}</p>}
        </div>
      </div>

      {/* Commandes */}
      {session && !denied && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 space-y-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-16 pb-4 transition-opacity duration-300 sm:px-8",
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div className="relative flex items-center gap-3">
            <span className="w-14 text-end text-xs text-white/80 tabular-nums">{formatClock(time)}</span>
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full">
                <div className="h-full bg-white/35" style={{ width: `${bufferedPercent}%` }} />
              </div>
              <Slider
                value={[progressPercent]}
                min={0}
                max={100}
                step={0.1}
                thumbLabel={t("seek")}
                aria-valuetext={`${formatClock(time)} / ${formatClock(duration)}`}
                onValueChange={([value]) => {
                  const video = videoRef.current;
                  if (video && duration > 0 && value !== undefined) {
                    lastTimeRef.current = null;
                    video.currentTime = (value / 100) * duration;
                  }
                }}
                className="[&_[data-slot=slider-track]]:bg-transparent"
              />
            </div>
            <span className="w-14 text-xs text-white/80 tabular-nums">{formatClock(duration)}</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} aria-label={playing ? t("pause") : t("play")}>
              {playing ? <PauseIcon className="size-6 fill-current" /> : <PlayIcon className="size-6 fill-current" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => seekBy(-10)} aria-label={t("rewind")}>
              <RotateCcwIcon className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => seekBy(10)} aria-label={t("forward")}>
              <RotateCwIcon className="size-5" />
            </Button>
            <div className="group/volume flex items-center">
              <Button
                variant="ghost"
                size="icon"
                aria-label={muted ? t("unmute") : t("mute")}
                onClick={() => {
                  if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
                }}
              >
                <VolumeIcon className="size-5" />
              </Button>
              <Slider
                value={[muted ? 0 : volume * 100]}
                min={0}
                max={100}
                step={1}
                thumbLabel={t("volume")}
                className="hidden w-24 sm:flex"
                rangeClassName="bg-white"
                onValueChange={([value]) => {
                  const video = videoRef.current;
                  if (!video || value === undefined) return;
                  video.volume = value / 100;
                  video.muted = value === 0;
                }}
              />
            </div>

            <div className="ms-auto flex items-center gap-1 sm:gap-2">
              {props.episodes.length > 1 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("episodes")}>
                      <ListVideoIcon className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="p-0" container={portalContainer}>
                    <SheetHeader className="border-b">
                      <SheetTitle>{t("episodes")}</SheetTitle>
                    </SheetHeader>
                    <ol className="overflow-y-auto px-2">
                      {props.episodes.map((episode) => (
                        <li key={episode.id}>
                          <button
                            type="button"
                            onClick={() => goToEpisode(episode.id)}
                            aria-current={episode.id === episodeId}
                            className={cn(
                              "w-full cursor-pointer rounded-lg px-3 py-2.5 text-start text-sm hover:bg-accent",
                              episode.id === episodeId && "bg-accent",
                            )}
                          >
                            <span className="block text-xs text-muted-foreground">{episode.label}</span>
                            <span className="font-medium">{episode.name}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </SheetContent>
                </Sheet>
              )}

              {session.subtitles.length > 0 && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("subtitles")} className={subtitle !== "off" ? "text-primary" : undefined}>
                      <CaptionsIcon className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" container={portalContainer}>
                    <DropdownMenuLabel>{t("subtitles")}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={subtitle} onValueChange={setSubtitle}>
                      <DropdownMenuRadioItem value="off">{t("subtitlesOff")}</DropdownMenuRadioItem>
                      {session.subtitles.map((track) => (
                        <DropdownMenuRadioItem key={track.id} value={track.language}>
                          {track.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t("settings")}>
                    <SettingsIcon className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56" container={portalContainer}>
                  {levels.length > 0 && (
                    <>
                      <DropdownMenuLabel>
                        {t("quality")}
                        {level === -1 && currentHeight ? ` · ${currentHeight}p` : ""}
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={String(level)}
                        onValueChange={(value) => {
                          const index = Number(value);
                          setLevel(index);
                          if (hlsRef.current) hlsRef.current.currentLevel = index;
                        }}
                      >
                        <DropdownMenuRadioItem value="-1">{t("auto")}</DropdownMenuRadioItem>
                        {levels.map((l) => (
                          <DropdownMenuRadioItem key={l.index} value={String(l.index)}>
                            {qualityLabel(l.height)}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuLabel>{t("speed")}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={String(rate)}
                    onValueChange={(value) => {
                      if (videoRef.current) videoRef.current.playbackRate = Number(value);
                    }}
                  >
                    {SPEEDS.map((speed) => (
                      <DropdownMenuRadioItem key={speed} value={String(speed)}>
                        {speed === 1 ? t("normal") : `${speed}×`}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("pictureInPicture")}
                  className="hidden sm:inline-flex"
                  onClick={() => {
                    const video = videoRef.current;
                    if (!video) return;
                    if (document.pictureInPictureElement) void document.exitPictureInPicture();
                    else void video.requestPictureInPicture().catch(() => undefined);
                  }}
                >
                  <PictureInPicture2Icon className="size-5" />
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}>
                {fullscreen ? <MinimizeIcon className="size-5" /> : <MaximizeIcon className="size-5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Décompte autonome : monté le temps du compte à rebours, son état repart de zéro à chaque affichage. */
function Countdown({ seconds, onComplete, children }: { seconds: number; onComplete: () => void; children: (remaining: number) => React.ReactNode }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const interval = setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (remaining <= 0) onComplete();
  }, [remaining, onComplete]);
  return <>{children(Math.max(remaining, 0))}</>;
}

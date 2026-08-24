'use client';

import { useEffect, useRef, useState } from 'react';
import { youtubeEmbedUrl } from '@/lib/youtube';

/**
 * YouTube player wired to the IFrame Player API.
 *
 * This deliberately does NOT use a plain `<iframe src=...>`. Student course
 * progress in this app is driven entirely by a `video_complete` action, which
 * used to come from the HTML5 `<video onEnded>` event. A bare iframe cannot
 * report playback state, so progress would silently drop to 0% for every
 * student. The IFrame API's `onStateChange` → `ENDED` is the replacement, and
 * it is the reason this component exists.
 */

/** Playback states we care about. See YT.PlayerState. */
const STATE_ENDED = 0;
const STATE_PLAYING = 1;

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  /** Fires once per mount when the video reaches the end. */
  onEnded?: () => void;
  /** Fires the first time playback actually starts. */
  onPlay?: () => void;
  className?: string;
}

/**
 * The API script is global and must only be injected once, however many
 * players mount. Resolves when `window.YT.Player` is constructible.
 */
let apiReady: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (apiReady) return apiReady;

  apiReady = new Promise<void>((resolve, reject) => {
    const w = window as any;
    if (w.YT?.Player) {
      resolve();
      return;
    }

    // YouTube calls this exactly once, globally. Chain any handler that a
    // previous script may already have registered.
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve();
    };

    const existing = document.getElementById('youtube-iframe-api');
    if (existing) return; // another mount is already loading it

    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiReady = null; // let a later mount retry
      reject(new Error('Could not load the YouTube player.'));
    };
    document.head.appendChild(script);
  });

  return apiReady;
}

export default function YouTubePlayer({
  videoId,
  title,
  onEnded,
  onPlay,
  className = '',
}: YouTubePlayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  // Callbacks live in refs so re-renders never tear down and rebuild the
  // player — remounting mid-lecture would lose the viewer's position.
  const onEndedRef = useRef(onEnded);
  const onPlayRef = useRef(onPlay);
  onEndedRef.current = onEnded;
  onPlayRef.current = onPlay;

  useEffect(() => {
    let cancelled = false;
    // Guards against `ended` firing more than once — YouTube can re-emit it
    // if the viewer scrubs back and reaches the end again, and completion
    // should only ever be counted once per mount.
    let hasEnded = false;
    let hasPlayed = false;

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const YT = (window as any).YT;

        playerRef.current = new YT.Player(hostRef.current, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          playerVars: {
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin:
              typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onStateChange: (event: { data: number }) => {
              if (event.data === STATE_PLAYING && !hasPlayed) {
                hasPlayed = true;
                onPlayRef.current?.();
              }
              if (event.data === STATE_ENDED && !hasEnded) {
                hasEnded = true;
                onEndedRef.current?.();
              }
            },
            onError: () => setFailed(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // The iframe may already be gone if React removed the host node first.
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // If the API cannot load (blocked script, offline), fall back to a plain
  // embed so the lecture is still watchable. Progress will not be tracked in
  // this state, which is strictly better than a black box.
  if (failed) {
    return (
      <div className={`relative w-full overflow-hidden rounded-lg bg-black ${className}`}>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-lg bg-black ${className}`}>
      {/* 16:9 box. The API replaces the inner div with its own iframe. */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <div className="absolute inset-0 h-full w-full">
          <div ref={hostRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

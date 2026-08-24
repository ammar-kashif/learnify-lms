/**
 * YouTube helpers for lecture playback.
 *
 * Lecture videos moved off S3 onto YouTube. The database stores only the
 * 11-character video id (`lecture_recordings.youtube_video_id`); every URL is
 * derived here so there is exactly one place that knows YouTube's URL shapes.
 */

/** YouTube ids are exactly 11 characters from the URL-safe base64 alphabet. */
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** True when the string is already a bare, well-formed video id. */
export function isYouTubeId(value: string): boolean {
  return VIDEO_ID_RE.test((value ?? '').trim());
}

/**
 * Extracts the video id from anything a teacher is likely to paste.
 *
 * Accepts:
 *   https://www.youtube.com/watch?v=ID       (and any extra query params)
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   https://www.youtube.com/live/ID
 *   https://m.youtube.com/... and youtube-nocookie.com variants
 *   a bare ID
 *
 * Returns null when nothing usable is found, so callers can show a real error
 * rather than silently storing junk.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;

  // Already an id.
  if (isYouTubeId(raw)) return raw;

  let url: URL;
  try {
    // Tolerate a pasted URL with no scheme.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const isYouTubeHost =
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be';
  if (!isYouTubeHost) return null;

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && isYouTubeId(id) ? id : null;
  }

  // /watch?v=<id>
  const v = url.searchParams.get('v');
  if (v && isYouTubeId(v)) return v;

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    const id = segments[1];
    if (isYouTubeId(id)) return id;
  }

  return null;
}

export interface EmbedOptions {
  /** Start muted — required for programmatic autoplay to work at all. */
  autoplay?: boolean;
  /** Where the player should resume from, in whole seconds. */
  startSeconds?: number;
  /** Origin for the IFrame API postMessage handshake. */
  origin?: string;
}

/**
 * Builds the embed URL.
 *
 * Uses youtube-nocookie.com — it does not set tracking cookies until playback
 * starts, which is the better default for a site aimed at school students.
 * `enablejsapi=1` is what lets the player report the ENDED state that drives
 * course progress; without it, progress tracking silently stops working.
 */
export function youtubeEmbedUrl(videoId: string, options: EmbedOptions = {}): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0', // keep "related videos" inside this channel
    modestbranding: '1',
    playsinline: '1',
  });

  if (options.autoplay) {
    params.set('autoplay', '1');
    params.set('mute', '1');
  }
  if (options.startSeconds && options.startSeconds > 0) {
    params.set('start', String(Math.floor(options.startSeconds)));
  }
  if (options.origin) {
    params.set('origin', options.origin);
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/** The public watch URL, for "open on YouTube" affordances. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Thumbnail URL.
 *
 * Use these with a plain `<img>`, not `next/image`: this project has no root
 * `next.config.js` (only `config/next.config.js`, which Next never loads), so
 * `images.domains` cannot allow `i.ytimg.com` without introducing one.
 */
export function youtubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'max' = 'high'
): string {
  const file = {
    default: 'default.jpg',
    medium: 'mqdefault.jpg',
    high: 'hqdefault.jpg',
    max: 'maxresdefault.jpg',
  }[quality];
  return `https://i.ytimg.com/vi/${videoId}/${file}`;
}

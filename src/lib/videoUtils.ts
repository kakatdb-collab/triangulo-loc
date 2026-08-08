/**
 * Helper to convert various video URL formats (YouTube watch, YouTube short, Vimeo, etc.)
 * into valid embed URLs for iframes.
 */
export function formatVideoEmbedUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();

  if (clean.includes("youtube.com/embed/")) {
    return clean;
  }

  // Standard YouTube watch link: https://www.youtube.com/watch?v=ID
  if (clean.includes("youtube.com/watch")) {
    const match = clean.match(/v=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const id = match[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1`;
    }
  }

  // YouTube short link: https://youtu.be/ID
  if (clean.includes("youtu.be/")) {
    const parts = clean.split("youtu.be/");
    if (parts[1]) {
      const id = parts[1].split("?")[0].split("&")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1`;
    }
  }

  // YouTube Shorts: https://www.youtube.com/shorts/ID
  if (clean.includes("youtube.com/shorts/")) {
    const parts = clean.split("youtube.com/shorts/");
    if (parts[1]) {
      const id = parts[1].split("?")[0].split("&")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1`;
    }
  }

  // Vimeo link: https://vimeo.com/ID
  if (clean.includes("vimeo.com/")) {
    const match = clean.match(/vimeo\.com\/([0-9]+)/);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}?autoplay=1&loop=1&muted=1`;
    }
  }

  return clean;
}

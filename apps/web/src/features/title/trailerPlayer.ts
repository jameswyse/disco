import { Effect } from "effect";

type YouTubePlayer = Readonly<{
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  destroy: () => void;
}>;

type YouTubeApi = Readonly<{
  Player: new (
    iframe: HTMLIFrameElement,
    options: Readonly<{
      events: Readonly<{
        onReady: (event: Readonly<{ target: YouTubePlayer }>) => void;
        onStateChange: (event: Readonly<{ data: number }>) => void;
        onError: () => void;
        onAutoplayBlocked: () => void;
      }>;
    }>,
  ) => YouTubePlayer;
}>;

declare global {
  interface Window {
    YT: YouTubeApi;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoading: Promise<YouTubeApi> | undefined;

function loadApi(): Promise<YouTubeApi> {
  apiLoading ??= Effect.runPromise(
    Effect.async<YouTubeApi, Error>((resume) => {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      window.onYouTubeIframeAPIReady = () => resume(Effect.succeed(window.YT));

      script.addEventListener(
        "error",
        () => {
          script.remove();
          apiLoading = undefined;
          resume(Effect.fail(new Error("The trailer player could not load.")));
        },
        { once: true },
      );

      document.head.append(script);
    }),
  );

  return apiLoading;
}

export type TrailerPlayback = "loading" | "playing" | "paused" | "error";

/** Own the external player and its DOM so closing during SDK loading cannot restart playback. */
export function attachTrailer({
  container,
  embedUrl,
  title,
  onPlayback,
}: Readonly<{
  container: HTMLElement;
  embedUrl: string;
  title: string;
  onPlayback: (state: TrailerPlayback) => void;
}>) {
  const iframe = document.createElement("iframe");
  iframe.src = `${embedUrl}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  iframe.title = `${title} trailer video`;
  iframe.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  // YouTube is cross-origin; scripts and its own origin are required by its player.
  iframe.sandbox.add("allow-scripts", "allow-same-origin", "allow-presentation");
  iframe.tabIndex = -1;
  container.append(iframe);

  let disposed = false;
  let player: YouTubePlayer | undefined;

  void loadApi().then(
    (api) => {
      if (disposed) {
        return undefined;
      }

      player = new api.Player(iframe, {
        events: {
          onReady: ({ target }) => {
            if (!disposed) {
              target.playVideo();
            }
          },
          onStateChange: ({ data }) => {
            if (data === 1) {
              onPlayback("playing");
            } else if (data === 0 || data === 2 || data === 5) {
              onPlayback("paused");
            }
          },
          onError: () => onPlayback("error"),
          onAutoplayBlocked: () => onPlayback("paused"),
        },
      });

      return undefined;
    },
    () => {
      if (!disposed) {
        iframe.remove();
        onPlayback("error");
      }
    },
  );

  return {
    togglePlayback: () => {
      if (player?.getPlayerState() === 1) {
        player.pauseVideo();
      } else {
        player?.playVideo();
      }
    },
    dispose: () => {
      disposed = true;
      player?.destroy();
      iframe.remove();
    },
  };
}

export function toggleTrailerFullscreen(element: Element): Promise<boolean> {
  return Effect.runPromise(
    Effect.tryPromise(() =>
      document.fullscreenElement ? document.exitFullscreen() : element.requestFullscreen(),
    ).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true })),
  );
}

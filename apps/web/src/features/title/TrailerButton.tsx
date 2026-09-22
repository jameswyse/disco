"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DiscoLoader } from "@/features/feedback/DiscoLoader";

import { attachTrailer, toggleTrailerFullscreen } from "./trailerPlayer";

import type { TrailerPlayback } from "./trailerPlayer";

import styles from "./TrailerButton.module.css";

function TrailerPlayer({
  embedUrl,
  title,
  onClose,
}: Readonly<{ embedUrl: string; title: string; onClose: () => void }>) {
  const player = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const playback = useRef<ReturnType<typeof attachTrailer>>(undefined);
  const [state, setState] = useState<TrailerPlayback>("loading");
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);

  useEffect(() => {
    closeButton.current?.focus();
    const container = video.current;

    if (!container) {
      return undefined;
    }

    const controller = attachTrailer({ container, embedUrl, title, onPlayback: setState });
    playback.current = controller;

    function updateFullscreen() {
      setFullscreen(document.fullscreenElement === player.current);
    }

    document.addEventListener("fullscreenchange", updateFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      controller.dispose();
    };
  }, [embedUrl, title]);

  return (
    <div className={styles.player} ref={player}>
      <div className={styles.video} ref={video} />
      {state === "loading" ? (
        <div className={styles.message}>
          <DiscoLoader label="Loading trailer…" size="inline" />
        </div>
      ) : null}
      {state === "error" ? (
        <p className={styles.message} role="alert">
          This trailer couldn’t be played.
        </p>
      ) : null}
      {fullscreenError ? (
        <p className={styles.message} role="alert">
          Fullscreen is unavailable in this browser.
        </p>
      ) : null}
      <button
        aria-label="Close trailer"
        className={`${styles.control} ${styles.close}`}
        onClick={onClose}
        ref={closeButton}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
      <button
        aria-label={state === "playing" ? "Pause trailer" : "Play trailer"}
        className={`${styles.control} ${styles.playback}`}
        disabled={state === "loading" || state === "error"}
        onClick={() => playback.current?.togglePlayback()}
        type="button"
      >
        <span aria-hidden="true">{state === "playing" ? "Ⅱ" : "▶"}</span>
      </button>
      <button
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        className={`${styles.control} ${styles.fullscreen}`}
        onClick={() => {
          if (player.current) {
            void toggleTrailerFullscreen(player.current).then((success) =>
              setFullscreenError(!success),
            );
          }
        }}
        type="button"
      >
        <span aria-hidden="true">⛶</span>
      </button>
    </div>
  );
}

export function TrailerButton({
  embedUrl,
  title,
  className,
  label = "▶ Play trailer",
}: Readonly<{ embedUrl: string; title: string; className: string | undefined; label?: string }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(async () => {
    if (document.fullscreenElement) {
      await toggleTrailerFullscreen(document.fullscreenElement);
    }

    dialog.current?.close();
    setOpen(false);
  }, []);

  return (
    <>
      <button
        className={className}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        ref={trigger}
        type="button"
      >
        {label}
      </button>
      <dialog
        aria-label={`${title} trailer`}
        className={styles.dialog}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            void close();
          }
        }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            void close();
          }
        }}
        ref={dialog}
      >
        {open ? <TrailerPlayer embedUrl={embedUrl} title={title} onClose={close} /> : null}
      </dialog>
    </>
  );
}

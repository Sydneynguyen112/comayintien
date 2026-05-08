"use client";

import { useEffect, useRef, useCallback } from "react";

const LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || "637951";

interface VideoPlayerProps {
  playbackId: string; // Bunny Stream Video GUID
  title?: string;
  onEnded?: () => void;
}

export function VideoPlayer({ playbackId, title, onEnded }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      // Bunny Stream sends postMessage events from the iframe
      if (typeof e.data !== "string") return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === "videoEnded" || msg.event === "ended") {
          onEndedRef.current?.();
        }
      } catch {
        // Not JSON — ignore
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const embedUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${playbackId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`;

  return (
    <div
      style={{ position: "relative", paddingTop: "56.25%", borderRadius: "0.75rem", overflow: "hidden" }}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        loading="lazy"
        style={{
          border: "none",
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "100%",
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title={title || "Video Player"}
      />
    </div>
  );
}

export function VideoPlaceholder({ title }: { title?: string }) {
  return (
    <div
      className="w-full bg-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground"
      style={{ aspectRatio: "16/9" }}
    >
      <svg className="h-12 w-12 mb-2 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <p className="text-sm">{title || "Video sẽ sớm được cập nhật"}</p>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
export default function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.volume = 0.2;
    let disposed = false;
    const removeListeners = () => {
      document.removeEventListener("pointerdown", startOnInteraction, true);
      document.removeEventListener("keydown", startOnInteraction, true);
    };
    function startOnInteraction(event: Event) {
      if (
        disposed ||
        manuallyPaused.current ||
        (event.target instanceof Element && event.target.closest(".lp-music"))
      )
        return;
      void player!.play().catch(() => {});
    }
    player.addEventListener("play", removeListeners);
    document.addEventListener("pointerdown", startOnInteraction, true);
    document.addEventListener("keydown", startOnInteraction, true);
    void player.play().catch((error) => {
      if (
        !disposed &&
        error.name !== "NotAllowedError" &&
        error.name !== "AbortError"
      )
        setFailed(true);
    });
    return () => {
      disposed = true;
      removeListeners();
      player.removeEventListener("play", removeListeners);
      player.pause();
    };
  }, []);
  async function toggle() {
    if (!audio.current || loading) return;
    setFailed(false);
    if (!audio.current.paused) {
      manuallyPaused.current = true;
      audio.current.pause();
      return;
    }
    manuallyPaused.current = false;
    setLoading(true);
    try {
      await audio.current.play();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="lp-music">
      <audio
        ref={audio}
        src="/audio/pede360-commercial.wav"
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setLoading(false);
          setPlaying(false);
          setFailed(true);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-pressed={playing}
        aria-label={
          playing
            ? "Pausar m\u00fasica de fundo"
            : "Ativar m\u00fasica de fundo"
        }
        title="Trilha instrumental original PEDE360"
      >
        <Music2 size={17} />
        <span>
          {loading
            ? "Carregando..."
            : playing
              ? "M\u00fasica ligada"
              : "Ativar m\u00fasica"}
        </span>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      {failed && (
        <span className="lp-music-error" role="status">
          {"N\u00e3o foi poss\u00edvel iniciar. Toque para tentar novamente."}
        </span>
      )}
    </div>
  );
}


import { useEffect, useRef } from "react";

const SOUND_STORAGE_KEY =
  "warranty_vault_sound_enabled";

const VOLUME_STORAGE_KEY =
  "warranty_vault_music_volume";

const DEFAULT_VOLUME = 0.35;

function AppAudio() {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(
      "/audio/warranty-vault.mp3"
    );

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = DEFAULT_VOLUME;

    audioRef.current = audio;

    // =====================================================
    // READ SAVED SETTINGS
    // =====================================================

    const isEnabled =
      localStorage.getItem(
        SOUND_STORAGE_KEY
      ) !== "false";

    const savedVolume =
      Number(
        localStorage.getItem(
          VOLUME_STORAGE_KEY
        )
      );

    if (
      Number.isFinite(savedVolume) &&
      savedVolume >= 0 &&
      savedVolume <= 1
    ) {
      audio.volume = savedVolume;
    }

    // =====================================================
    // START MUSIC
    // =====================================================

    const startMusic = async () => {
      const enabled =
        localStorage.getItem(
          SOUND_STORAGE_KEY
        ) !== "false";

      if (!enabled) {
        return;
      }

      try {
        await audio.play();

        console.log(
          "Warranty Vault music started"
        );

        removeListeners();
      } catch (error) {
        console.log(
          "Browser is waiting for user interaction before playing music."
        );
      }
    };

    // =====================================================
    // REMOVE INTERACTION LISTENERS
    // =====================================================

    const removeListeners = () => {
      window.removeEventListener(
        "click",
        startMusic
      );

      window.removeEventListener(
        "pointerdown",
        startMusic
      );

      window.removeEventListener(
        "touchstart",
        startMusic
      );

      window.removeEventListener(
        "keydown",
        startMusic
      );
    };

    // =====================================================
    // TRY IMMEDIATELY
    // =====================================================

    if (isEnabled) {
      startMusic();
    }

    // =====================================================
    // START AFTER FIRST REAL USER INTERACTION
    // =====================================================

    window.addEventListener(
      "click",
      startMusic
    );

    window.addEventListener(
      "pointerdown",
      startMusic
    );

    window.addEventListener(
      "touchstart",
      startMusic
    );

    window.addEventListener(
      "keydown",
      startMusic
    );

    // =====================================================
    // PROFILE CONTROLS
    // =====================================================

    const handleSoundChange = (
      event
    ) => {
      const {
        enabled,
        volume,
      } =
        event.detail || {};

      if (
        typeof volume === "number"
      ) {
        audio.volume = Math.min(
          Math.max(volume, 0),
          1
        );
      }

      if (
        enabled === false
      ) {
        audio.pause();
      }

      if (
        enabled === true
      ) {
        audio
          .play()
          .catch(() => {});
      }
    };

    window.addEventListener(
      "warrantySoundChange",
      handleSoundChange
    );

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      removeListeners();

      window.removeEventListener(
        "warrantySoundChange",
        handleSoundChange
      );

      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  return null;
}

export default AppAudio;


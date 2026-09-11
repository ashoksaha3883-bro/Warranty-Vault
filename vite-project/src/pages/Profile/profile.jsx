import {
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Mail,
  Package,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserRound,
  Volume2,
  VolumeX,
  X,
  LogOut,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext.jsx";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const OVERRIDE_KEY =
  "warranty_vault_overrides";

const SOUND_STORAGE_KEY =
  "warranty_vault_sound_enabled";

const VOLUME_STORAGE_KEY =
  "warranty_vault_music_volume";

const DEFAULT_VOLUME =
  0.35;

const DAY_MS =
  1000 *
  60 *
  60 *
  24;

// =========================================================
// OVERRIDES
// =========================================================

const readOverrides = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem(
        OVERRIDE_KEY
      ) || "{}"
    );

    return {
      updated:
        value?.updated &&
        typeof value.updated ===
          "object"
          ? value.updated
          : {},

      deleted:
        Array.isArray(
          value?.deleted
        )
          ? value.deleted.map(String)
          : [],
    };
  } catch (error) {
    console.error(
      "Unable to read warranty overrides:",
      error
    );

    return {
      updated: {},
      deleted: [],
    };
  }
};

// =========================================================
// APPLY THE SAME PRODUCT OVERRIDES USED BY PRODUCTS PAGE
// =========================================================

const applyWarrantyOverrides = (
  list
) => {
  const overrides =
    readOverrides();

  return list
    .map((item) => {
      const id = String(
        item?._id ||
          item?.id ||
          ""
      );

      if (
        overrides.updated[id]
      ) {
        return {
          ...item,
          ...overrides.updated[id],
        };
      }

      return item;
    })
    .filter((item) => {
      const id = String(
        item?._id ||
          item?.id ||
          ""
      );

      return !overrides.deleted.includes(
        id
      );
    });
};

// =========================================================
// DATE HELPERS
// =========================================================

const getDaysLeft = (
  endDate
) => {
  if (!endDate) {
    return null;
  }

  const end =
    new Date(endDate);

  if (
    Number.isNaN(
      end.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  end.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      end.getTime() -
      today.getTime()
    ) / DAY_MS
  );
};

// =========================================================
// COMPONENT
// =========================================================

function Profile() {
  const {
    user,
    token,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [
    warranties,
    setWarranties,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    emailNotificationsEnabled,
    setEmailNotificationsEnabled,
  ] = useState(true);

  const [
    soundEnabled,
    setSoundEnabled,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        SOUND_STORAGE_KEY
      );

    return saved !==
      "false";
  });

  const [
    musicVolume,
    setMusicVolume,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        VOLUME_STORAGE_KEY
      );

    const parsed =
      Number(saved);

    if (
      Number.isFinite(
        parsed
      ) &&
      parsed >= 0 &&
      parsed <= 1
    ) {
      return parsed;
    }

    return DEFAULT_VOLUME;
  });

  const [
    isSavingNotification,
    setIsSavingNotification,
  ] = useState(false);

  const [
    showLogoutModal,
    setShowLogoutModal,
  ] = useState(false);

  // =========================================================
  // USER
  // =========================================================

  const displayName =
    user?.name ||
    "Warranty User";

  const email =
    user?.email ||
    "No email available";

  const firstLetter =
    displayName
      .charAt(0)
      .toUpperCase() ||
    "W";

  // =========================================================
  // LOAD WARRANTIES
  // =========================================================

  const loadWarranties =
    useCallback(
      async () => {
        if (!token) {
          setWarranties([]);
          setIsLoading(
            false
          );
          return;
        }

        try {
          setIsLoading(
            true
          );

          const response =
            await fetch(
              `${API_URL}/warranty`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  Accept:
                    "application/json",
                },

                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Unable to load warranties"
            );
          }

          const warrantyData =
            Array.isArray(
              data.warranties
            )
              ? data.warranties
              : [];

          /*
          IMPORTANT:

          Products page does not use
          raw server warranties directly.

          It first applies:
          1. local product updates
          2. local deleted products

          Profile must use the exact
          same source so all counts match.
          */

          const syncedWarranties =
            applyWarrantyOverrides(
              warrantyData
            );

          setWarranties(
            syncedWarranties
          );
        } catch (error) {
          console.error(
            "Unable to load warranties:",
            error
          );

          setWarranties([]);
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [token]
    );

  // =========================================================
  // LOAD EMAIL SETTINGS
  // =========================================================

  const loadNotificationSettings =
    useCallback(
      async () => {
        if (!token) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/notifications`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  Accept:
                    "application/json",
                },

                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            return;
          }

          setEmailNotificationsEnabled(
            data?.notifications
              ?.email !==
              false
          );
        } catch (error) {
          console.error(
            "Notification settings error:",
            error
          );
        }
      },
      [token]
    );

  // =========================================================
  // INITIAL LOAD + KEEP PROFILE IN SYNC
  // =========================================================

  useEffect(() => {
    if (!token) {
      return;
    }

    loadWarranties();
    loadNotificationSettings();

    const handleWarrantyUpdate =
      () => {
        loadWarranties();
      };

    const handleStorageChange =
      (event) => {
        if (
          event.key ===
          OVERRIDE_KEY
        ) {
          loadWarranties();
        }
      };

    window.addEventListener(
      "warrantyVaultUpdated",
      handleWarrantyUpdate
    );

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "warrantyVaultUpdated",
        handleWarrantyUpdate
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, [
    token,
    loadWarranties,
    loadNotificationSettings,
  ]);

  // =========================================================
  // WARRANTY SUMMARY
  // =========================================================

  const warrantySummary =
    useMemo(() => {
      let total = 0;
      let active = 0;
      let expiring = 0;

      let nextWarranty =
        null;

      let nextDays =
        null;

      for (
        const warranty of warranties
      ) {
        total++;

        const days =
          getDaysLeft(
            warranty?.warrantyEndDate
          );

        /*
        Match Products page exactly.

        Products page:
        - expired: days < 0
        - expiring: days <= 30
        - active: days > 30

        So Profile must use
        the same rules.
        */

        if (
          days !== null &&
          days < 0
        ) {
          continue;
        }

        if (
          days !== null &&
          days <= 30
        ) {
          expiring++;
        } else if (
          days !== null &&
          days > 30
        ) {
          active++;
        }

        /*
        Find the nearest valid
        upcoming warranty.
        */

        if (
          days !== null &&
          days >= 0 &&
          (
            nextDays === null ||
            days < nextDays
          )
        ) {
          nextDays =
            days;

          nextWarranty =
            warranty;
        }
      }

      return {
        total,
        active,
        expiring,
        nextWarranty,
        nextDays,
      };
    }, [
      warranties,
    ]);

  // =========================================================
  // EMAIL TOGGLE
  // =========================================================

  const handleEmailToggle =
    async () => {
      if (
        isSavingNotification ||
        !token
      ) {
        return;
      }

      const newValue =
        !emailNotificationsEnabled;

      try {
        setIsSavingNotification(
          true
        );

        const response =
          await fetch(
            `${API_URL}/notifications/email`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,

                Accept:
                  "application/json",
              },

              body:
                JSON.stringify({
                  enabled:
                    newValue,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to update notifications"
          );
        }

        const savedValue =
          data?.notifications
            ?.email;

        setEmailNotificationsEnabled(
          typeof savedValue ===
            "boolean"
            ? savedValue
            : newValue
        );

        if (
          soundEnabled
        ) {
          playSmallSound();
        }
      } catch (error) {
        console.error(
          "Email notification update error:",
          error
        );

        alert(
          "Unable to update email notifications."
        );
      } finally {
        setIsSavingNotification(
          false
        );
      }
    };

  // =========================================================
  // SMALL UI SOUND
  // =========================================================

  const playSmallSound =
    () => {
      if (!soundEnabled) {
        return;
      }

      try {
        const AudioContext =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContext) {
          return;
        }

        const context =
          new AudioContext();

        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.connect(
          gain
        );

        gain.connect(
          context.destination
        );

        const now =
          context.currentTime;

        oscillator.type =
          "sine";

        oscillator.frequency.setValueAtTime(
          520,
          now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
          680,
          now + 0.1
        );

        gain.gain.setValueAtTime(
          0.0001,
          now
        );

        gain.gain.exponentialRampToValueAtTime(
          0.025,
          now + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + 0.14
        );

        oscillator.start(
          now
        );

        oscillator.stop(
          now + 0.16
        );
      } catch (error) {
        console.error(
          "UI sound error:",
          error
        );
      }
    };

  // =========================================================
  // MUSIC TOGGLE
  // =========================================================

  const handleSoundToggle =
    () => {
      const newValue =
        !soundEnabled;

      setSoundEnabled(
        newValue
      );

      localStorage.setItem(
        SOUND_STORAGE_KEY,
        String(newValue)
      );

      window.dispatchEvent(
        new CustomEvent(
          "warrantySoundChange",
          {
            detail: {
              enabled:
                newValue,

              volume:
                musicVolume,
            },
          }
        )
      );

      if (newValue) {
        setTimeout(() => {
          playSmallSound();
        }, 20);
      }
    };

  // =========================================================
  // MUSIC VOLUME
  // =========================================================

  const handleVolumeChange =
    (event) => {
      const value =
        Number(
          event.target.value
        );

      const newVolume =
        value / 100;

      setMusicVolume(
        newVolume
      );

      localStorage.setItem(
        VOLUME_STORAGE_KEY,
        String(newVolume)
      );

      window.dispatchEvent(
        new CustomEvent(
          "warrantySoundChange",
          {
            detail: {
              enabled:
                soundEnabled,

              volume:
                newVolume,
            },
          }
        )
      );
    };

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh =
    async () => {
      playSmallSound();

      await Promise.all([
        loadWarranties(),
        loadNotificationSettings(),
      ]);
    };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout =
    () => {
      logout();

      setShowLogoutModal(
        false
      );

      navigate("/", {
        replace: true,
      });
    };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pb-32 pt-6 sm:px-5 md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">

        {/* HEADER */}

        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
              Account
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Profile
            </h1>
          </div>

          <button
            type="button"
            onClick={
              handleRefresh
            }
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 sm:h-11 sm:w-11"
            aria-label="Refresh"
          >
            <RefreshCw
              size={17}
            />
          </button>
        </header>

        {/* PROFILE CARD */}

        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white shadow-xl transition duration-300 hover:shadow-2xl sm:p-6 lg:p-7">
          <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-white text-xl font-bold text-slate-950 shadow-lg sm:h-20 sm:w-20 sm:text-2xl">
                {firstLetter}
              </div>

              <div className="min-w-0 flex-1 sm:hidden">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-bold">
                    {displayName}
                  </h2>

                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <Check
                      size={12}
                      strokeWidth={3}
                    />
                  </span>
                </div>

                <p className="mt-1 truncate text-sm text-slate-400">
                  {email}
                </p>

                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Account active
                </div>
              </div>
            </div>

            <div className="relative hidden min-w-0 flex-1 sm:block">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold lg:text-2xl">
                  {displayName}
                </h2>

                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <Check
                    size={12}
                    strokeWidth={3}
                  />
                </span>
              </div>

              <p className="mt-1 truncate text-sm text-slate-400">
                {email}
              </p>

              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Account active
              </div>
            </div>
          </div>

          <div className="relative mt-5 border-t border-white/10 pt-4">
            <div className="flex items-start gap-3">
              <Mail
                size={16}
                className="mt-0.5 shrink-0 text-violet-300"
              />

              <p className="text-[11px] leading-5 text-slate-400">
                This email receives important
                warranty reminders and product
                expiration information.
              </p>
            </div>
          </div>
        </section>

        {/* WARRANTY SUMMARY */}

        <section className="mt-7">
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Your protection
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Warranty summary
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                <Package
                  size={17}
                  className="text-violet-600"
                />
              </div>

              <p className="mt-3 text-xl font-bold text-slate-950">
                {isLoading
                  ? "—"
                  : warrantySummary.total}
              </p>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Total
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <ShieldCheck
                  size={17}
                  className="text-emerald-600"
                />
              </div>

              <p className="mt-3 text-xl font-bold text-slate-950">
                {isLoading
                  ? "—"
                  : warrantySummary.active}
              </p>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Active
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <Clock3
                  size={17}
                  className="text-amber-600"
                />
              </div>

              <p className="mt-3 text-xl font-bold text-slate-950">
                {isLoading
                  ? "—"
                  : warrantySummary.expiring}
              </p>

              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Expiring
              </p>
            </div>
          </div>
        </section>

        {/* NEXT EXPIRY */}

        {warrantySummary.nextWarranty && (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <Clock3
                    size={18}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Next to expire
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-slate-900">
                    {
                      warrantySummary
                        .nextWarranty
                        .productName ||
                      warrantySummary
                        .nextWarranty
                        .name ||
                      "Your product"
                    }
                  </p>
                </div>
              </div>

              <span className="self-start rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-amber-700 shadow-sm sm:self-auto">
                {warrantySummary.nextDays ===
                0
                  ? "Today"
                  : `${warrantySummary.nextDays} days`}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/products"
                )
              }
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 active:scale-[0.98]"
            >
              View warranty

              <ChevronRight
                size={14}
              />
            </button>
          </section>
        )}

        {/* PREFERENCES */}

        <section className="mt-7">
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Preferences
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* EMAIL */}

            <button
              type="button"
              onClick={
                handleEmailToggle
              }
              disabled={
                isSavingNotification
              }
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Bell
                  size={18}
                  className="text-violet-600"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Warranty email reminders
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {emailNotificationsEnabled
                    ? "Enabled for this account"
                    : "Currently turned off"}
                </p>
              </div>

              <span
                className={`relative h-7 w-12 rounded-full transition ${
                  emailNotificationsEnabled
                    ? "bg-violet-600"
                    : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    emailNotificationsEnabled
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </span>
            </button>

            <div className="ml-[68px] border-t border-slate-100" />

            {/* APP MUSIC */}

            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  {soundEnabled ? (
                    <Volume2
                      size={18}
                      className="text-blue-600"
                    />
                  ) : (
                    <VolumeX
                      size={18}
                      className="text-slate-500"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    App music
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {soundEnabled
                      ? `Background music • ${Math.round(
                          musicVolume *
                            100
                        )}% volume`
                      : "Background music is off"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleSoundToggle
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    soundEnabled
                      ? "bg-blue-600"
                      : "bg-slate-300"
                  }`}
                  aria-label="Toggle app music"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      soundEnabled
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div
                className={`mt-4 transition-all duration-300 ${
                  soundEnabled
                    ? "opacity-100"
                    : "pointer-events-none opacity-40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Music volume
                  </p>

                  <span className="text-[10px] font-semibold text-slate-500">
                    {Math.round(
                      musicVolume *
                        100
                    )}
                    %
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(
                    musicVolume *
                      100
                  )}
                  onChange={
                    handleVolumeChange
                  }
                  className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
                  aria-label="Music volume"
                />

                <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                  <span>
                    Low
                  </span>
                  <span>
                    Medium
                  </span>
                  <span>
                    High
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ACCOUNT */}

        <section className="mt-7">
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Account
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/products"
                )
              }
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <Shield
                  size={18}
                  className="text-slate-600"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  My warranties
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  View your saved products and documents
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-slate-400"
              />
            </button>

            <div className="ml-[68px] border-t border-slate-100" />

            <div className="flex items-center gap-3 px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <UserRound
                  size={18}
                  className="text-slate-600"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {displayName}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {email}
                </p>
              </div>

              <ShieldCheck
                size={17}
                className="text-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* VERSION */}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Warranty Vault
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Warranty Core
              </p>
            </div>

            <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold text-white">
              v1.0.0
            </span>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-500">
            Account authentication, Smart Scan,
            warranty storage, product protection
            tracking and automatic expiry email
            reminders.
          </p>
        </section>

        {/* LOGOUT */}

        <button
          type="button"
          onClick={() =>
            setShowLogoutModal(
              true
            )
          }
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 active:scale-[0.98]"
        >
          <LogOut
            size={18}
          />

          Log out
        </button>

        <p className="mt-5 text-center text-[10px] font-medium tracking-wide text-slate-400">
          WARRANTY VAULT • v1.0.0
        </p>
      </div>

      {/* LOGOUT MODAL */}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[500] flex items-end justify-center bg-slate-950/70 px-4 pb-4 backdrop-blur-sm sm:items-center">
          <div className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(
                  false
                )
              }
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X
                size={17}
              />
            </button>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <LogOut
                size={24}
                className="text-red-600"
              />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-950">
              Log out?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You will need to sign in again to
              access your Warranty Vault account.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98]"
              >
                Yes, log out
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowLogoutModal(
                    false
                  )
                }
                className="w-full rounded-2xl bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Profile;


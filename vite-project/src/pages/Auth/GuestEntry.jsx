import {
  useState,
} from "react";

import {
  useAuth,
} from "../../context/AuthContext.jsx";

import AuthLanding from "./AuthLanding.jsx";
import Home from "../Home/home.jsx";
import BottomNavigation from "../../components/layout/BottomNavigation.jsx";

const GUEST_MODE_KEY =
  "warranty_guest_mode";

function GuestEntry() {
  const {
    user,
    loading,
  } = useAuth();

  const [
    guestMode,
    setGuestMode,
  ] = useState(
    () =>
      sessionStorage.getItem(
        GUEST_MODE_KEY
      ) === "true"
  );

  // ==========================================
  // AUTHENTICATION CHECK LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
            <span className="text-xl font-bold">
              W
            </span>
          </div>

          <p className="text-sm text-slate-400">
            Loading Warranty Vault...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // LOGGED-IN USER
  // ==========================================

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        <Home />

        <BottomNavigation />
      </div>
    );
  }

  // ==========================================
  // GUEST USER
  // ==========================================

  if (guestMode) {
    return (
      <div className="min-h-screen bg-slate-50 pb-28">
        <Home />

        <BottomNavigation />
      </div>
    );
  }

  // ==========================================
  // NEW / LOGGED-OUT USER
  // ==========================================

  return (
    <AuthLanding
      onSkip={() => {
        sessionStorage.setItem(
          GUEST_MODE_KEY,
          "true"
        );

        setGuestMode(true);
      }}
    />
  );
}

export default GuestEntry;
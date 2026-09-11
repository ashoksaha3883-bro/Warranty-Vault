
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Loader2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";

function Login() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  // =========================================================
  // LOGIN CONFIRMATION POPUP
  // =========================================================

  const [showLoginConfirmation, setShowLoginConfirmation] =
    useState(false);

  const [loggedInEmail, setLoggedInEmail] =
    useState("");

  // =========================================================
  // LOGIN
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // Basic validation
    if (!email.trim() || !password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setIsLoading(true);

      // Login through AuthContext
      const data = await login(
        email.trim(),
        password
      );

      // =====================================================
      // GET THE REAL LOGGED-IN EMAIL
      // =====================================================

      const userEmail =
        data?.user?.email ||
        email.trim();

      setLoggedInEmail(userEmail);

      // =====================================================
      // SAVE LOGIN SUCCESS
      // =====================================================

      sessionStorage.setItem(
        "warranty_login_success",
        "true"
      );

      // =====================================================
      // SHOW CONFIRMATION POPUP
      // =====================================================

      setShowLoginConfirmation(true);

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setError(
        error.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // CONTINUE AFTER LOGIN CONFIRMATION
  // =========================================================

  const handleLoginConfirmation =
    () => {
      setShowLoginConfirmation(false);

      navigate("/profile");
    };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full">

          {/* ==================================================
              LOGO / BRAND
          ================================================== */}

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl">
              <ShieldCheck
                size={32}
                strokeWidth={2}
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Sign in to your Warranty Vault account
            </p>
          </div>

          {/* ==================================================
              LOGIN CARD
          ================================================== */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* ==================================================
                  EMAIL
              ================================================== */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/30 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {/* ==================================================
                  PASSWORD
              ================================================== */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/30 focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:text-white"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* ==================================================
                  SIGN IN
              ================================================== */}

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />

                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in

                    <ArrowRight
                      size={18}
                    />
                  </>
                )}
              </button>
            </form>

            {/* ==================================================
                SIGN UP
            ================================================== */}

            <div className="mt-7 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?
              </p>

              <Link
                to="/register"
                className="mt-2 inline-block text-sm font-semibold text-white transition hover:text-slate-300"
              >
                Create your account
              </Link>

              {/* ==================================================
                  SKIP
              ================================================== */}

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(
                    "warranty_welcome_seen",
                    "true"
                  );

                  navigate("/", {
                    replace: true,
                  });
                }}
                className="mt-5 block w-full text-sm font-medium text-slate-500 transition hover:text-white"
              >
                Skip for now
              </button>
            </div>
          </div>

          {/* ==================================================
              SECURITY
          ================================================== */}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={15} />

            Your account is protected with secure authentication
          </div>
        </div>
      </div>

      {/* ======================================================
          LOGIN CONFIRMATION MODAL
      ====================================================== */}

      {showLoginConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 px-5 backdrop-blur-sm">

          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">

            {/* ==================================================
                CLOSE BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={
                handleLoginConfirmation
              }
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Close"
            >
              <X size={17} />
            </button>

            {/* ==================================================
                MODAL CONTENT
            ================================================== */}

            <div className="p-7 sm:p-8">

              {/* SUCCESS ICON */}

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2
                  size={30}
                />
              </div>

              {/* TITLE */}

              <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
                You're signed in
              </h2>

              {/* MESSAGE */}

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your account is signed in with
                the registered email below.
              </p>

              {/* EMAIL */}

              <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                  Registered email
                </p>

                <p className="mt-2 break-all text-sm font-bold text-slate-900">
                  {loggedInEmail}
                </p>
              </div>

              {/* EXPLANATION */}

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-600">
                  We’ll use this email to send
                  you important information about
                  your saved products, including
                  warranty reminders and expiry
                  dates.
                </p>
              </div>

              {/* BUTTON */}

              <button
                type="button"
                onClick={
                  handleLoginConfirmation
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                Got it

                <ArrowRight
                  size={17}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Login;


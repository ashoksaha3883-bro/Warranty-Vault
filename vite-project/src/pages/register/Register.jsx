import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext.jsx";

function Register() {
  const navigate =
    useNavigate();

  const {
    register,
  } = useAuth();

  const [
    name,
    setName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setIsLoading(true);

      try {
        await register(
          name,
          email,
          password
        );

        alert(
          "Your account has been created successfully!"
        );

        navigate("/");
      } catch (error) {
        setError(
          error?.message ||
            "Unable to create account"
        );
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-slate-950 px-5 py-8 text-white">

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">

        {/* Logo */}

        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-violet-600 shadow-xl shadow-violet-600/30">
            <ShieldCheck
              size={32}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-violet-300">

            <Sparkles
              size={15}
            />

            <span className="text-xs font-semibold uppercase tracking-wider">
              Warranty Vault
            </span>

          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Create your account
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Start protecting your warranties in one secure place.
          </p>

        </div>

        {/* Form Card */}

        <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl">

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-5"
          >

            {/* Name */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-300">
                Full name
              </label>

              <div className="relative">

                <User
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:bg-white/[0.08]"
                />

              </div>
            </div>

            {/* Email */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-300">
                Email address
              </label>

              <div className="relative">

                <Mail
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:bg-white/[0.08]"
                />

              </div>
            </div>

            {/* Password */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Create a password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:bg-white/[0.08]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={19}
                    />
                  ) : (
                    <Eye
                      size={19}
                    />
                  )}
                </button>

              </div>
            </div>

            {/* Error */}

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Submit */}

            <button
              type="submit"
              disabled={
                isLoading
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? "Creating account..."
                : "Create account"}

              {!isLoading && (
                <ArrowRight
                  size={18}
                />
              )}
            </button>

          </form>

          {/* Login */}

          <div className="mt-6 border-t border-white/10 pt-6 text-center">

            <p className="text-sm text-slate-500">
              Already have an account?
            </p>

            <Link
              to="/auth"
              className="mt-1 inline-block text-sm font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Sign in
            </Link>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Register;
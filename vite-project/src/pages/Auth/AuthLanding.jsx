import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Clock3,
  FileCheck2,
} from "lucide-react";
import { Link } from "react-router-dom";

function AuthLanding({ onSkip }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
            <ShieldCheck size={24} strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-[0.18em]">
              WARRANTY VAULT
            </h1>

            <p className="text-[11px] text-slate-500">
              Your warranties. Always protected.
            </p>
          </div>
        </div>

        {/* Main */}
        <section className="flex flex-1 flex-col justify-center py-12">
          {/* Icon */}
          <div className="mb-7">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-3 rounded-[1.5rem] border border-white/5" />

              <ShieldCheck
                size={54}
                strokeWidth={1.5}
                className="relative text-white"
              />

              <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900 shadow-lg">
                <Sparkles size={17} className="text-slate-300" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Welcome to Warranty Vault
            </p>

            <h2 className="text-4xl font-bold leading-[1.08] tracking-tight">
              Never lose track of
              <span className="block text-slate-400">
                a warranty again.
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Keep your product receipts and warranty information organized
              in one secure place and stay informed before your coverage ends.
            </p>
          </div>

          {/* Features */}
          <div className="mt-9 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <FileCheck2
                size={19}
                className="mx-auto mb-2 text-slate-300"
              />

              <p className="text-[11px] font-medium text-slate-300">
                Store
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                Receipts
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <Clock3
                size={19}
                className="mx-auto mb-2 text-slate-300"
              />

              <p className="text-[11px] font-medium text-slate-300">
                Track
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                Warranty
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <CheckCircle2
                size={19}
                className="mx-auto mb-2 text-slate-300"
              />

              <p className="text-[11px] font-medium text-slate-300">
                Remind
              </p>

              <p className="mt-1 text-[10px] text-slate-600">
                On time
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-9 space-y-3">
            {/* Sign In */}
            <Link
              to="/auth"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-950 shadow-xl transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Sign in

              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

            {/* Create Account */}
            <Link
              to="/register"
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Create an account
            </Link>
          </div>

          {/* Skip */}
          <button
            type="button"
            onClick={onSkip}
            className="mx-auto mt-6 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-white"
          >
            Skip for now
          </button>
        </section>

        {/* Footer */}
        <div className="pb-2 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <ShieldCheck size={14} />

            <span>
              Secure account & warranty protection
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AuthLanding;
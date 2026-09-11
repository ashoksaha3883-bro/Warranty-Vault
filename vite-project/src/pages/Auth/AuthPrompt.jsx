import {
  ArrowRight,
  LogIn,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function AuthPrompt({ isOpen, onClose, message }) {
  const navigate = useNavigate();

  if (!isOpen) {
    return null;
  }

  const handleSignIn = () => {
    onClose();

    navigate("/auth");
  };

  const handleCreateAccount = () => {
    onClose();

    navigate("/register");
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center bg-slate-950/75 px-4 pb-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white text-slate-950">
          <ShieldCheck size={28} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="pr-8">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Sign in required
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {message ||
              "Create an account or sign in to continue using this feature."}
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 space-y-3">

          {/* Sign In */}
          <button
            type="button"
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 active:scale-[0.98]"
          >
            <LogIn size={18} />

            Sign in

            <ArrowRight size={17} />
          </button>

          {/* Create Account */}
          <button
            type="button"
            onClick={handleCreateAccount}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
          >
            <UserPlus size={18} />

            Create account
          </button>

        </div>

        {/* Maybe later */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2 text-sm font-medium text-slate-500 transition hover:text-white"
        >
          Maybe later
        </button>

      </div>
    </div>
  );
}

export default AuthPrompt;
import { useEffect, useState } from "react";
import {
  Check,
  FileText,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const steps = [
  "Preparing your document",
  "Reading important details",
  "Finding product information",
  "Checking warranty details",
];

function AnalyzingScreen({ file, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 100) {
          clearInterval(interval);
          return 100;
        }

        return previous + 4;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((previous) => {
        if (previous >= steps.length - 1) {
          clearInterval(stepInterval);
          return previous;
        }

        return previous + 1;
      });
    }, 1500);

    return () => clearInterval(stepInterval);
  }, []);

  useEffect(() => {
    if (progress < 100) return;

    const timeout = setTimeout(() => {
      onComplete();
    }, 600);

    return () => clearTimeout(timeout);
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden bg-slate-950">
      <div className="absolute -left-20 top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute -right-20 bottom-20 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />

<div className="relative z-10 mx-auto flex h-full min-h-[100dvh] w-full max-w-md flex-col px-5 py-8">        {/* Top */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-500/30">
              <ShieldCheck size={23} />
            </div>

            <div>
              <p className="font-bold text-white">
                Warranty Vault
              </p>

              <p className="text-xs text-slate-400">
                Secure document analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-violet-200">
            <Sparkles size={13} />
            Smart Scan
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />

            <div className="absolute inset-3 rounded-full border border-violet-400/30" />

            <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
              <ScanLine
                size={42}
                className="animate-pulse text-white"
              />
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="flex items-center justify-center gap-2">
              <LoaderCircle
                size={18}
                className="animate-spin text-violet-400"
              />

              <p className="text-sm font-medium text-violet-300">
                Smart analysis in progress
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Analyzing your
              <br />
              warranty document
            </h1>

            <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-slate-400">
              We're reading the important details and preparing
              everything for your review.
            </p>
          </div>

          {/* Progress */}
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                Analyzing
              </span>

              <span className="text-sm font-bold text-white">
                {progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="mt-8 space-y-3">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-500 ${
                    isCurrent
                      ? "border-violet-500/30 bg-violet-500/10"
                      : "border-white/5 bg-white/[0.03]"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isCurrent
                        ? "bg-violet-500 text-white"
                        : "bg-white/5 text-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={17} />
                    ) : isCurrent ? (
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <FileText size={16} />
                    )}
                  </div>

                  <div>
                    <p
                      className={`text-sm ${
                        isCompleted || isCurrent
                          ? "font-medium text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {step}
                    </p>

                    {isCurrent && (
                      <p className="mt-1 text-xs text-violet-300">
                        Please wait a moment...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Your document is processed securely.
        </p>
      </div>
    </div>
  );
}

export default AnalyzingScreen;

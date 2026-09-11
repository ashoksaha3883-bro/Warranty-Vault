import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  ShieldCheck,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext.jsx";

import {
  getWarrantyDocument,
  createDocumentUrl,
} from "../../untils/warrantyDocumentStore.js";

const API_URL =
  "https://your-backend-domain.com/api";

const OVERRIDE_KEY =
  "warranty_vault_overrides";

function readOverrides() {
  try {
    const value = JSON.parse(
      localStorage.getItem(
        OVERRIDE_KEY
      ) || "{}"
    );

    return {
      updated:
        value?.updated &&
        typeof value.updated === "object"
          ? value.updated
          : {},

      deleted:
        Array.isArray(value?.deleted)
          ? value.deleted.map(String)
          : [],
    };
  } catch {
    return {
      updated: {},
      deleted: [],
    };
  }
}

function applyOverrides(
  warranty
) {
  if (!warranty) {
    return null;
  }

  const overrides =
    readOverrides();

  const id = String(
    warranty._id ||
      warranty.id ||
      ""
  );

  if (
    overrides.deleted.includes(
      id
    )
  ) {
    return null;
  }

  return overrides.updated[id]
    ? {
        ...warranty,
        ...overrides.updated[id],
      }
    : warranty;
}

function WarrantyDetails() {
  const { id } =
    useParams();

  const { token } =
    useAuth();

  const [warranty, setWarranty] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [document, setDocument] =
    useState(null);

  const [documentUrl, setDocumentUrl] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWarranty() {
      setLoading(true);
      setWarranty(null);

      try {
        if (!token) {
          return;
        }

    const response = await fetch(`${API_URL}/warranty`, {
  headers: { Authorization: `Bearer ${token}` },
});

const result = await response.json();

if (!response.ok || !result?.success) {
  throw new Error(result?.message || "Unable to load warranty.");
}

const list = Array.isArray(result.warranties) ? result.warranties : [];

const warrantyId = decodeURIComponent(String(id || ""));

const found = list.find(
  (item) =>
    String(item?._id || item?.id || "") === warrantyId
);

if (!cancelled) setWarranty(applyOverrides(found));
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Unable to load warranty:",
            error
          );

          setWarranty(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWarranty();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  useEffect(() => {
    let activeUrl = "";
    let cancelled = false;

    async function loadDocument() {
      if (!warranty) {
        return;
      }

      try {
        const record =
          await getWarrantyDocument(
            String(
              warranty._id ||
                warranty.id
            )
          );

        if (cancelled) {
          return;
        }

        setDocument(record);

        if (record?.file) {
          activeUrl =
            createDocumentUrl(
              record
            );

          setDocumentUrl(
            activeUrl
          );
        } else {
          setDocumentUrl("");
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Unable to load document:",
            error
          );
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;

      if (activeUrl) {
        URL.revokeObjectURL(
          activeUrl
        );
      }
    };
  }, [warranty]);

  const formatDate =
    (value) => {
      if (!value) {
        return "Not available";
      }

      const date =
        new Date(
          `${value}T00:00:00`
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    };

  const getWarrantyStatus =
    (endDate) => {
      if (!endDate) {
        return {
          label: "Unknown",
          className:
            "bg-slate-100 text-slate-600",
        };
      }

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const end =
        new Date(
          `${endDate}T00:00:00`
        );

      end.setHours(
        0,
        0,
        0,
        0
      );

      const daysLeft =
        Math.ceil(
          (end.getTime() -
            today.getTime()) /
            86400000
        );

      if (daysLeft < 0) {
        return {
          label: "Expired",
          className:
            "bg-red-100 text-red-700",
        };
      }

      if (daysLeft <= 7) {
        return {
          label: `${daysLeft} ${
            daysLeft === 1
              ? "day"
              : "days"
          } left`,
          className:
            "bg-amber-100 text-amber-700",
        };
      }

      return {
        label: "Active",
        className:
          "bg-emerald-100 text-emerald-700",
      };
    };

  const status =
    useMemo(
      () =>
        getWarrantyStatus(
          warranty?.warrantyEndDate
        ),
      [
        warranty?.warrantyEndDate,
      ]
    );

  const fileType =
    document?.fileType || "";

  const isImage =
    fileType.startsWith(
      "image/"
    );

  const handleDownload =
    () => {
      if (!documentUrl) {
        alert(
          "The original document is not available on this device."
        );

        return;
      }

      const link =
        document.createElement(
          "a"
        );

      link.href =
        documentUrl;

      link.download =
        document.fileName ||
        `${warranty?.productName || "warranty-document"}`;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">

        <div className="flex min-h-screen items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading warranty...
            </p>

          </div>

        </div>

      </div>
    );
  }

  if (!warranty) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 py-10">

        <div className="mx-auto max-w-2xl">

          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-violet-600"
          >
            <ArrowLeft size={18} />
            Back to Products
          </Link>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <AlertCircle size={26} />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Warranty not found
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This warranty could not be found in your Warranty Vault.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Go to Products
            </Link>

          </div>

        </div>

      </div>
    );
  }

  const productName =
    warranty.productName ||
    warranty.name ||
    "Unnamed Product";

  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      <div className="mx-auto w-full max-w-4xl px-5 py-6 sm:px-7 lg:px-10">

        <div className="flex items-center justify-between">

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-violet-200 hover:text-violet-600"
          >
            <ArrowLeft size={18} />
            Back
          </Link>

          {documentUrl && (
            <button
              onClick={
                handleDownload
              }
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
            >
              <Download size={18} />
              Download
            </button>
          )}

        </div>

        <section className="mt-7">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <div className="flex items-center gap-2 text-violet-600">

                <ShieldCheck size={19} />

                <span className="text-sm font-semibold">
                  Warranty Details
                </span>

              </div>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {productName}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {warranty.brand ||
                  "Brand not available"}{" "}
                •{" "}
                {warranty.category ||
                  "Other"}
              </p>

            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${status.className}`}
            >
              {status.label}
            </span>

          </div>

        </section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <FileText size={19} />
              </div>

              <div className="min-w-0">

                <p className="text-sm font-bold text-slate-900">
                  Your document
                </p>

                <p className="max-w-[260px] truncate text-xs text-slate-500">
                  {document?.fileName ||
                    "Document stored on this device"}
                </p>

              </div>

            </div>

            {documentUrl && (
              <button
                onClick={
                  handleDownload
                }
                type="button"
                className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 sm:flex sm:items-center sm:gap-2"
              >
                <Download size={15} />
                Download
              </button>
            )}

          </div>

          <div className="bg-slate-100 p-4 sm:p-6">

            {!documentUrl ? (

              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 text-center">

                <FileText
                  size={40}
                  className="text-slate-300"
                />

                <p className="mt-4 text-sm font-bold text-slate-700">
                  Document preview unavailable
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  The warranty information is stored in your account. The original document is available only on the device where it was saved.
                </p>

              </div>

            ) : isImage ? (

              <div className="flex justify-center rounded-2xl bg-white p-3 shadow-sm">

                <img
                  src={documentUrl}
                  alt={
                    document.fileName ||
                    productName
                  }
                  className="max-h-[650px] w-auto max-w-full rounded-xl object-contain"
                />

              </div>

            ) : (

              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

                <iframe
                  src={documentUrl}
                  title={
                    document.fileName ||
                    "Warranty PDF"
                  }
                  className="h-[650px] w-full"
                />

              </div>

            )}

          </div>

        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-2">

            <CalendarDays
              size={19}
              className="text-violet-600"
            />

            <h2 className="text-lg font-bold text-slate-900">
              Warranty information
            </h2>

          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

            <InfoItem
              label="Product"
              value={
                productName
              }
            />

            <InfoItem
              label="Brand"
              value={
                warranty.brand ||
                "Not available"
              }
            />

            <InfoItem
              label="Category"
              value={
                warranty.category ||
                "Other"
              }
            />

            <InfoItem
              label="Purchase date"
              value={formatDate(
                warranty.purchaseDate
              )}
            />

            <InfoItem
              label="Warranty starts"
              value={formatDate(
                warranty.warrantyStartDate
              )}
            />

            <InfoItem
              label="Warranty ends"
              value={formatDate(
                warranty.warrantyEndDate
              )}
            />

            <InfoItem
              label="Warranty duration"
              value={
                warranty.warrantyDuration ||
                "Not available"
              }
            />

            <InfoItem
              label="Invoice number"
              value={
                warranty.invoiceNumber ||
                "Not available"
              }
            />

          </div>

        </section>

        <section className="mt-6 rounded-3xl border border-violet-100 bg-violet-50 p-5 sm:p-6">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <ShieldCheck size={21} />
            </div>

            <div>

              <h2 className="text-sm font-bold text-violet-950">
                Your warranty is connected
              </h2>

              <p className="mt-1 text-xs leading-5 text-violet-900/70">
                Warranty information is stored in your account. Your original document stays on the device where you saved it.
              </p>

            </div>

          </div>

        </section>

        {documentUrl && (
          <>
            <button
              onClick={
                handleDownload
              }
              type="button"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800"
            >
              <Download size={19} />
              Download original document
            </button>

            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm hover:border-violet-200 hover:bg-violet-50"
            >
              <ExternalLink size={18} />
              Open document
            </a>
          </>
        )}

      </div>

    </div>
  );
}

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">

      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>

    </div>
  );
}

export default WarrantyDetails;
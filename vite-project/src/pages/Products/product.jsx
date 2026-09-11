import {
  Package,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Clock3,
  ChevronRight,
  Plus,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  Save,
  FileText,
  CalendarDays,
  Tag,
  Hash,
  Upload,
  ExternalLink,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import {
  createDocumentUrl,
  deleteWarrantyDocument,
  getWarrantyDocument,
} from "../../untils/warrantyDocumentStore.js";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const OVERRIDE_KEY = "warranty_vault_overrides";

/* =========================================================
   SMALL LOCAL OVERRIDE STORAGE
   Keeps the old Edit/Delete UI behavior without storing
   the complete warranty list in localStorage.
========================================================= */

function readOverrides() {
  try {
    const value = JSON.parse(
      localStorage.getItem(OVERRIDE_KEY) || "{}"
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

function writeOverrides(value) {
  try {
    localStorage.setItem(
      OVERRIDE_KEY,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      "Unable to save local overrides:",
      error
    );
  }
}

function applyOverrides(list) {
  const overrides = readOverrides();

  return list
    .map((item) => {
      const id = String(
        item?._id ||
          item?.id ||
          ""
      );

      if (overrides.updated[id]) {
        return {
          ...item,
          ...overrides.updated[id],
        };
      }

      return item;
    })
    .filter(
      (item) =>
        !overrides.deleted.includes(
          String(
            item?._id ||
              item?.id ||
              ""
          )
        )
    );
}

/* =========================================================
   DATE HELPERS
========================================================= */

/*
  Accepts:
  2026-09-10

  OR:

  2026-09-10T00:00:00.000Z

  This fixes the previous invalid-date problem.
*/
function parseDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(value.getTime());
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  /*
    Pure date:
    YYYY-MM-DD
  */
  const pureDateMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (pureDateMatch) {
    const year =
      Number(pureDateMatch[1]);

    const month =
      Number(pureDateMatch[2]) - 1;

    const day =
      Number(pureDateMatch[3]);

    const date = new Date(
      year,
      month,
      day
    );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  /*
    ISO date/time:
    2026-09-10T00:00:00.000Z
  */
  const date = new Date(text);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

/*
  Converts a date value into a local date-only
  representation so timezone differences do not
  incorrectly change the day count.
*/
function getDateOnly(value) {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

/*
  Format for <input type="date">
*/
function formatInputDate(value) {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  Display date
*/
function formatDate(value) {
  const date =
    getDateOnly(value);

  if (!date) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   WARRANTY STATUS
========================================================= */

function getWarrantyInfo(product) {
  const endDate =
    product?.warrantyEndDate;

  if (!endDate) {
    return {
      daysLeft: 0,
      status: "Unknown",
      statusType: "unknown",
    };
  }

  const end =
    getDateOnly(endDate);

  if (!end) {
    return {
      daysLeft: 0,
      status: "Unknown",
      statusType: "unknown",
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

  const difference =
    end.getTime() -
    today.getTime();

  const daysLeft =
    Math.ceil(
      difference /
        86400000
    );

  if (daysLeft < 0) {
    return {
      daysLeft,
      status: "Expired",
      statusType: "expired",
    };
  }

  if (daysLeft <= 3) {
    return {
      daysLeft,
      status: "Ending Soon",
      statusType: "urgent",
    };
  }

  if (daysLeft <= 30) {
    return {
      daysLeft,
      status: "Ending Soon",
      statusType: "warning",
    };
  }

  return {
    daysLeft,
    status: "Active",
    statusType: "active",
  };
}

/* =========================================================
   GENERAL HELPERS
========================================================= */

function getId(product) {
  return String(
    product?._id ||
      product?.id ||
      ""
  );
}

function getProductName(product) {
  return (
    product?.productName ||
    product?.name ||
    "Unnamed Product"
  );
}

function getFileUrl(product) {
  return (
    product?.productImageUrl ||
    product?.imageUrl ||
    product?.image ||
    ""
  );
}

function isPdf(product) {
  const type =
    product?.fileType ||
    "";

  const name =
    product?.fileName ||
    "";

  return (
    type
      .toLowerCase()
      .includes("pdf") ||
    name
      .toLowerCase()
      .endsWith(".pdf")
  );
}

/* =========================================================
   SAFE API RESPONSE
========================================================= */

async function readApiResponse(response) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }

  const text =
    await response.text();

  console.error(
    "Warranty API returned non-JSON response:",
    {
      status: response.status,
      statusText:
        response.statusText,
      contentType,
      responsePreview:
        text.slice(0, 300),
    }
  );

  throw new Error(
    `Warranty API returned ${response.status} ${response.statusText}. Please check that the backend is running on port 5000.`
  );
}

/* =========================================================
   PRODUCT PAGE
========================================================= */

function Product() {
  const navigate =
    useNavigate();

  const { token } =
    useAuth();

  const [products, setProducts] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [editForm, setEditForm] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [documentUrl, setDocumentUrl] =
    useState("");

  const [documentName, setDocumentName] =
    useState("");

  /* =====================================================
     LOAD PRODUCTS FROM MONGODB
  ===================================================== */

  const loadProducts =
    useCallback(
      async () => {
        if (!token) {
          setProducts([]);
          setLoading(false);
          setError(
            "Please sign in to view your saved warranties."
          );
          return;
        }

        setLoading(true);
        setError("");

        try {
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

                cache: "no-store",
              }
            );

          const result =
            await readApiResponse(
              response
            );

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ||
                "Unable to load your warranties."
            );
          }

          const serverProducts =
            Array.isArray(
              result.warranties
            )
              ? result.warranties
              : [];

          const finalProducts =
            applyOverrides(
              serverProducts
            );

          setProducts(
            finalProducts
          );
        } catch (
          requestError
        ) {
          console.error(
            "Unable to load products:",
            requestError
          );

          setProducts([]);

          setError(
            requestError?.message ||
              "Unable to load your warranties."
          );
        } finally {
          setLoading(false);
        }
      },
      [token]
    );

  /* =====================================================
     INITIAL LOAD + WARRANTY UPDATE EVENT
  ===================================================== */

  useEffect(() => {
    loadProducts();

    const handleUpdate =
      () => {
        loadProducts();
      };

    window.addEventListener(
      "warrantyVaultUpdated",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "warrantyVaultUpdated",
        handleUpdate
      );
    };
  }, [loadProducts]);

  /* =====================================================
     LOAD DOCUMENT FROM INDEXEDDB
  ===================================================== */

  useEffect(() => {
    let objectUrl = "";

    let cancelled = false;

    const loadDocument =
      async () => {
        if (!selectedProduct) {
          setDocumentUrl("");
          setDocumentName("");
          return;
        }

        try {
          const id =
            getId(
              selectedProduct
            );

          const record =
            await getWarrantyDocument(
              id
            );

          if (cancelled) {
            return;
          }

          /*
            Prefer the local IndexedDB
            document.
          */
          if (record?.file) {
            setDocumentName(
              record.fileName ||
                "Warranty document"
            );

            objectUrl =
              createDocumentUrl(
                record
              );

            setDocumentUrl(
              objectUrl
            );

            return;
          }

          /*
            Fallback to backend document URL
            when available.
          */
          if (
            selectedProduct.documentUrl
          ) {
            setDocumentName(
              selectedProduct.fileName ||
                "Warranty document"
            );

            setDocumentUrl(
              selectedProduct.documentUrl
            );

            return;
          }

          setDocumentName(
            selectedProduct.fileName ||
              ""
          );

          setDocumentUrl("");
        } catch (
          documentError
        ) {
          if (!cancelled) {
            console.error(
              "Unable to load product document:",
              documentError
            );

            setDocumentUrl("");
          }
        }
      };

    loadDocument();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl
        );
      }
    };
  }, [selectedProduct]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredProducts =
    useMemo(
      () => {
        const value =
          search
            .trim()
            .toLowerCase();

        if (!value) {
          return products;
        }

        return products.filter(
          (product) => {
            const name =
              getProductName(
                product
              );

            const brand =
              product?.brand ||
              "";

            const category =
              product?.category ||
              "";

            return `${name} ${brand} ${category}`
              .toLowerCase()
              .includes(value);
          }
        );
      },
      [products, search]
    );

  /* =====================================================
     STATS
  ===================================================== */

  const stats =
    useMemo(
      () => {
        let active = 0;
        let ending = 0;
        let expired = 0;

        for (
          const product of products
        ) {
          const type =
            getWarrantyInfo(
              product
            ).statusType;

          if (
            type === "active"
          ) {
            active += 1;
          } else if (
            type === "expired"
          ) {
            expired += 1;
          } else if (
            type === "urgent" ||
            type === "warning"
          ) {
            ending += 1;
          }
        }

        return {
          active,
          ending,
          expired,
        };
      },
      [products]
    );

  /* =====================================================
     OPEN PRODUCT
  ===================================================== */

  const openProduct =
    (product) => {
      setSelectedProduct(
        product
      );

      setEditForm({
        productName:
          getProductName(
            product
          ),

        brand:
          product?.brand ||
          "",

        category:
          product?.category ||
          "",

        purchaseDate:
          formatInputDate(
            product?.purchaseDate
          ),

        warrantyStartDate:
          formatInputDate(
            product?.warrantyStartDate
          ),

        warrantyEndDate:
          formatInputDate(
            product?.warrantyEndDate
          ),

        warrantyDuration:
          product?.warrantyDuration ||
          "",

        invoiceNumber:
          product?.invoiceNumber ||
          "",
      });

      setIsEditing(false);
    };

  /* =====================================================
     CLOSE PRODUCT
  ===================================================== */

  const closeProduct =
    () => {
      setSelectedProduct(
        null
      );

      setIsEditing(false);

      setEditForm({});

      setDocumentUrl("");

      setDocumentName("");
    };

  /* =====================================================
     EDIT FIELD
  ===================================================== */

  const handleEditChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setEditForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  /* =====================================================
     SAVE EDITED PRODUCT
     
     Backend does not currently expose
     UPDATE /api/warranty/:id.

     Therefore preserve the original
     edit behavior locally without putting
     the entire warranty list in localStorage.
  ===================================================== */

  const saveEditedProduct =
    () => {
      if (!selectedProduct) {
        return;
      }

      const id =
        getId(
          selectedProduct
        );

      if (!id) {
        return;
      }

      const updatedProduct = {
        ...selectedProduct,

        ...editForm,

        productName:
          editForm.productName,

        name:
          editForm.productName,

        updatedAt:
          new Date().toISOString(),
      };

      const overrides =
        readOverrides();

      overrides.updated[id] = {
        productName:
          updatedProduct.productName,

        name:
          updatedProduct.name,

        brand:
          updatedProduct.brand,

        category:
          updatedProduct.category,

        purchaseDate:
          updatedProduct.purchaseDate,

        warrantyStartDate:
          updatedProduct.warrantyStartDate,

        warrantyEndDate:
          updatedProduct.warrantyEndDate,

        warrantyDuration:
          updatedProduct.warrantyDuration,

        invoiceNumber:
          updatedProduct.invoiceNumber,

        updatedAt:
          updatedProduct.updatedAt,
      };

      writeOverrides(
        overrides
      );

      setProducts(
        (current) =>
          current.map(
            (item) =>
              getId(item) ===
              id
                ? updatedProduct
                : item
          )
      );

      setSelectedProduct(
        updatedProduct
      );

      setIsEditing(false);

      window.dispatchEvent(
        new Event(
          "warrantyVaultUpdated"
        )
      );

      alert(
        "Product information updated successfully!"
      );
    };

  /* =====================================================
     DELETE PRODUCT

     Preserves original delete behavior
     locally and removes IndexedDB document.
  ===================================================== */

  const deleteProduct =
    async () => {
      if (!selectedProduct) {
        return;
      }

      const id =
        getId(
          selectedProduct
        );

      if (!id) {
        return;
      }

      const productName =
        getProductName(
          selectedProduct
        );

      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${productName}"?`
        );

      if (!confirmed) {
        return;
      }

      const overrides =
        readOverrides();

      delete overrides.updated[
        id
      ];

      if (
        !overrides.deleted.includes(
          id
        )
      ) {
        overrides.deleted.push(
          id
        );
      }

      writeOverrides(
        overrides
      );

      setProducts(
        (current) =>
          current.filter(
            (item) =>
              getId(item) !==
              id
          )
      );

      try {
        await deleteWarrantyDocument(
          id
        );
      } catch (
        documentError
      ) {
        console.error(
          "Unable to remove local document:",
          documentError
        );
      }

      closeProduct();

      window.dispatchEvent(
        new Event(
          "warrantyVaultUpdated"
        )
      );
    };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading your products...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="mx-auto w-full max-w-5xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="px-5 pt-6 sm:px-7 lg:px-10 lg:pt-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-violet-600">
                Your protection
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                My Products
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Your saved warranties from your Warranty Vault account.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Package size={23} />
            </div>
          </div>
        </header>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="px-5 pt-7 sm:px-7 lg:px-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

            <StatCard
              title="Active"
              value={stats.active}
              text="Protected products"
              icon={
                <ShieldCheck size={18} />
              }
              dark
            />

            <StatCard
              title="Ending soon"
              value={stats.ending}
              text="Needs attention"
              icon={
                <Clock3 size={18} />
              }
            />

            <StatCard
              title="Expired"
              value={stats.expired}
              text="Warranty ended"
              icon={
                <AlertCircle size={18} />
              }
              danger
              wide
            />

          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <section className="px-5 pt-6 sm:px-7 lg:px-10">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">

                <AlertCircle
                  size={20}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                  <p className="text-sm font-bold text-red-800">
                    Unable to load warranties
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={loadProducts}
                    className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    Try again
                  </button>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="px-5 pt-7 sm:px-7 lg:px-10">
          <div className="flex gap-3">

            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">

              <Search
                size={19}
                className="shrink-0 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search products..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />

            </div>

            <button
              type="button"
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 active:scale-95"
              aria-label="Product filters"
            >
              <SlidersHorizontal size={19} />
            </button>

          </div>
        </section>

        {/* =================================================
            PRODUCTS
        ================================================= */}

        <section className="px-5 pt-8 sm:px-7 lg:px-10">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="text-lg font-bold text-slate-900">
                All Products
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {products.length}{" "}
                {products.length === 1
                  ? "product"
                  : "products"}{" "}
                protected
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/")
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition hover:bg-violet-200 active:scale-95"
              aria-label="Add warranty"
            >
              <Plus size={20} />
            </button>

          </div>

          {/* EMPTY */}

          {!error &&
            products.length === 0 && (
              <div className="mt-5 rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Package size={29} />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  No products yet
                </h2>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Scan or upload your first warranty document to start protecting your product.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/")
                  }
                  className="mt-6 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
                >
                  Add Warranty
                </button>

              </div>
            )}

          {/* NO SEARCH RESULT */}

          {products.length > 0 &&
            filteredProducts.length === 0 && (
              <div className="mt-5 rounded-3xl bg-white p-8 text-center shadow-sm">

                <Search
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-4 font-bold text-slate-900">
                  No products found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try another product name or category.
                </p>

              </div>
            )}

          {/* PRODUCT CARDS */}

          <div className="mt-5 space-y-4">

            {filteredProducts.map(
              (product) => {

                const warranty =
                  getWarrantyInfo(
                    product
                  );

                const isExpired =
                  warranty.statusType ===
                  "expired";

                const isEnding =
                  warranty.statusType ===
                    "urgent" ||
                  warranty.statusType ===
                    "warning";

                const productName =
                  getProductName(
                    product
                  );

                const image =
                  getFileUrl(
                    product
                  );

                return (
                  <button
                    key={getId(product)}
                    type="button"
                    onClick={() =>
                      openProduct(
                        product
                      )
                    }
                    className="group w-full rounded-[28px] border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg active:scale-[0.99] sm:p-5"
                  >

                    <div className="flex items-start gap-4">

                      {/* PRODUCT IMAGE */}

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600">

                        {image ? (
                          <img
                            src={image}
                            alt={
                              productName
                            }
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package
                            size={28}
                          />
                        )}

                      </div>

                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="truncate font-bold text-slate-900 sm:text-base">
                              {productName}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {product?.brand ||
                                "Brand not detected"}{" "}
                              •{" "}
                              {product?.category ||
                                "Other"}
                            </p>

                          </div>

                          <ChevronRight
                            size={20}
                            className="mt-0.5 shrink-0 text-slate-400 transition duration-300 group-hover:translate-x-1 group-hover:text-violet-600"
                          />

                        </div>

                        {/* STATUS */}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

                          <div
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              isExpired
                                ? "bg-red-100 text-red-700"
                                : isEnding
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >

                            {isExpired ? (
                              <AlertCircle
                                size={13}
                              />
                            ) : (
                              <ShieldCheck
                                size={13}
                              />
                            )}

                            {warranty.status}

                          </div>

                          <div className="text-right">

                            <p
                              className={`text-xs font-bold ${
                                isExpired
                                  ? "text-red-600"
                                  : isEnding
                                  ? "text-amber-600"
                                  : "text-violet-600"
                              }`}
                            >

                              {isExpired
                                ? `Expired ${Math.abs(
                                    warranty.daysLeft
                                  )} ${
                                    Math.abs(
                                      warranty.daysLeft
                                    ) === 1
                                      ? "day"
                                      : "days"
                                  } ago`
                                : `${warranty.daysLeft} ${
                                    warranty.daysLeft ===
                                    1
                                      ? "day"
                                      : "days"
                                  } left`}

                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              Ends{" "}
                              {formatDate(
                                product?.warrantyEndDate
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </section>
      </div>

      {/* =================================================
          PRODUCT DETAILS MODAL
      ================================================= */}

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:px-6"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeProduct();
            }
          }}
        >

          <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">

            <div className="w-full overflow-hidden rounded-[32px] bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7">

                <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />

                <div className="relative z-10 flex items-start justify-between gap-4">

                  <div className="flex min-w-0 items-center gap-3">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">

                      {getFileUrl(
                        selectedProduct
                      ) &&
                      !isPdf(
                        selectedProduct
                      ) ? (
                        <img
                          src={getFileUrl(
                            selectedProduct
                          )}
                          alt={getProductName(
                            selectedProduct
                          )}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package
                          size={23}
                          className="text-violet-300"
                        />
                      )}

                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-medium text-violet-300">
                        Warranty Details
                      </p>

                      <h2 className="mt-1 truncate text-xl font-bold sm:text-2xl">
                        {getProductName(
                          selectedProduct
                        )}
                      </h2>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      closeProduct
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>

                </div>

              </div>

              {/* BODY */}

              <div className="p-5 sm:p-7">

                {/* DOCUMENT PREVIEW */}

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">

                  {documentUrl ? (
                    documentUrl
                      .startsWith(
                        "blob:"
                      ) &&
                    documentName
                      .toLowerCase()
                      .endsWith(
                        ".pdf"
                      ) ? (

                      <div className="p-5">

                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl bg-white text-center">

                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                            <FileText
                              size={30}
                            />
                          </div>

                          <p className="mt-4 font-bold text-slate-900">
                            PDF Warranty Document
                          </p>

                          <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                            {documentName ||
                              "Warranty document"}
                          </p>

                          <a
                            href={
                              documentUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-700"
                          >
                            Open Document
                            <ExternalLink
                              size={15}
                            />
                          </a>

                        </div>

                      </div>

                    ) : (
                      <div className="bg-white">

                        <img
                          src={
                            documentUrl
                          }
                          alt={getProductName(
                            selectedProduct
                          )}
                          className="max-h-[360px] w-full object-contain"
                        />

                      </div>
                    )
                  ) : (
                    <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">

                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                        <FileText
                          size={30}
                        />
                      </div>

                      <p className="mt-4 font-bold text-slate-900">
                        No document preview
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        The original document is not available on this device.
                      </p>

                    </div>
                  )}

                </div>

                {/* WARRANTY STATUS */}

                <div className="mt-5">

                  {(() => {
                    const warranty =
                      getWarrantyInfo(
                        selectedProduct
                      );

                    const expired =
                      warranty.statusType ===
                      "expired";

                    const ending =
                      warranty.statusType ===
                        "urgent" ||
                      warranty.statusType ===
                        "warning";

                    return (
                      <div
                        className={`flex items-center justify-between rounded-2xl px-4 py-4 ${
                          expired
                            ? "bg-red-50"
                            : ending
                            ? "bg-amber-50"
                            : "bg-emerald-50"
                        }`}
                      >

                        <div className="flex items-center gap-3">

                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              expired
                                ? "bg-red-100 text-red-600"
                                : ending
                                ? "bg-amber-100 text-amber-600"
                                : "bg-emerald-100 text-emerald-600"
                            }`}
                          >
                            {expired ? (
                              <AlertCircle
                                size={19}
                              />
                            ) : (
                              <ShieldCheck
                                size={19}
                              />
                            )}
                          </div>

                          <div>

                            <p className="text-sm font-bold text-slate-900">
                              {warranty.status}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {expired
                                ? `Expired ${Math.abs(
                                    warranty.daysLeft
                                  )} ${
                                    Math.abs(
                                      warranty.daysLeft
                                    ) === 1
                                      ? "day"
                                      : "days"
                                  } ago`
                                : `${warranty.daysLeft} ${
                                    warranty.daysLeft ===
                                    1
                                      ? "day"
                                      : "days"
                                  } remaining`}
                            </p>

                          </div>

                        </div>

                        <Clock3
                          size={20}
                          className={
                            expired
                              ? "text-red-400"
                              : ending
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        />

                      </div>
                    );
                  })()}

                </div>

                {/* =================================================
                    PRODUCT INFORMATION
                ================================================= */}

                {!isEditing ? (
                  <div className="mt-6">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          Product Information
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Saved warranty details
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setIsEditing(
                            true
                          )
                        }
                        className="flex items-center gap-2 rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-200 active:scale-95"
                      >
                        <Pencil
                          size={15}
                        />
                        Edit
                      </button>

                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                      <InfoCard
                        icon={
                          <Package
                            size={17}
                          />
                        }
                        label="Product Name"
                        value={getProductName(
                          selectedProduct
                        )}
                      />

                      <InfoCard
                        icon={
                          <Tag
                            size={17}
                          />
                        }
                        label="Brand"
                        value={
                          selectedProduct?.brand ||
                          "Not available"
                        }
                      />

                      <InfoCard
                        icon={
                          <Package
                            size={17}
                          />
                        }
                        label="Category"
                        value={
                          selectedProduct?.category ||
                          "Not available"
                        }
                      />

                      <InfoCard
                        icon={
                          <CalendarDays
                            size={17}
                          />
                        }
                        label="Purchase Date"
                        value={formatDate(
                          selectedProduct?.purchaseDate
                        )}
                      />

                      <InfoCard
                        icon={
                          <CalendarDays
                            size={17}
                          />
                        }
                        label="Warranty Start"
                        value={formatDate(
                          selectedProduct?.warrantyStartDate
                        )}
                      />

                      <InfoCard
                        icon={
                          <CalendarDays
                            size={17}
                          />
                        }
                        label="Warranty End"
                        value={formatDate(
                          selectedProduct?.warrantyEndDate
                        )}
                      />

                      <InfoCard
                        icon={
                          <Clock3
                            size={17}
                          />
                        }
                        label="Warranty Duration"
                        value={
                          selectedProduct?.warrantyDuration ||
                          "Not available"
                        }
                      />

                      <InfoCard
                        icon={
                          <Hash
                            size={17}
                          />
                        }
                        label="Invoice Number"
                        value={
                          selectedProduct?.invoiceNumber ||
                          "Not available"
                        }
                      />

                      <InfoCard
                        icon={
                          <FileText
                            size={17}
                          />
                        }
                        label="Document"
                        value={
                          documentName ||
                          selectedProduct?.fileName ||
                          "Not available"
                        }
                      />

                      <InfoCard
                        icon={
                          <Upload
                            size={17}
                          />
                        }
                        label="Saved On"
                        value={formatDate(
                          selectedProduct?.createdAt ||
                            selectedProduct?.savedAt
                        )}
                      />

                    </div>

                  </div>
                ) : (
                  /* =================================================
                     EDIT FORM
                  ================================================= */

                  <div className="mt-6">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-lg font-bold text-slate-900">
                          Edit Information
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Update your warranty details
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setIsEditing(
                            false
                          )
                        }
                        className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                      >
                        Cancel
                      </button>

                    </div>

                    <div className="mt-5 space-y-4">

                      <EditField
                        label="Product Name"
                        name="productName"
                        value={
                          editForm.productName
                        }
                        onChange={
                          handleEditChange
                        }
                        icon={
                          <Package
                            size={16}
                          />
                        }
                      />

                      <EditField
                        label="Brand"
                        name="brand"
                        value={
                          editForm.brand
                        }
                        onChange={
                          handleEditChange
                        }
                        icon={
                          <Tag
                            size={16}
                          />
                        }
                      />

                      <EditField
                        label="Category"
                        name="category"
                        value={
                          editForm.category
                        }
                        onChange={
                          handleEditChange
                        }
                        icon={
                          <Package
                            size={16}
                          />
                        }
                      />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                        <EditField
                          label="Purchase Date"
                          name="purchaseDate"
                          type="date"
                          value={
                            editForm.purchaseDate
                          }
                          onChange={
                            handleEditChange
                          }
                          icon={
                            <CalendarDays
                              size={16}
                            />
                          }
                        />

                        <EditField
                          label="Warranty Start"
                          name="warrantyStartDate"
                          type="date"
                          value={
                            editForm.warrantyStartDate
                          }
                          onChange={
                            handleEditChange
                          }
                          icon={
                            <CalendarDays
                              size={16}
                            />
                          }
                        />

                        <EditField
                          label="Warranty End"
                          name="warrantyEndDate"
                          type="date"
                          value={
                            editForm.warrantyEndDate
                          }
                          onChange={
                            handleEditChange
                          }
                          icon={
                            <CalendarDays
                              size={16}
                            />
                          }
                        />

                        <EditField
                          label="Warranty Duration"
                          name="warrantyDuration"
                          value={
                            editForm.warrantyDuration
                          }
                          onChange={
                            handleEditChange
                          }
                          icon={
                            <Clock3
                              size={16}
                            />
                          }
                        />

                      </div>

                      <EditField
                        label="Invoice Number"
                        name="invoiceNumber"
                        value={
                          editForm.invoiceNumber
                        }
                        onChange={
                          handleEditChange
                        }
                        icon={
                          <Hash
                            size={16}
                          />
                        }
                      />

                    </div>

                    <button
                      type="button"
                      onClick={
                        saveEditedProduct
                      }
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.99]"
                    >
                      <Save
                        size={18}
                      />
                      Save Changes
                    </button>

                  </div>
                )}

                {/* =================================================
                    DELETE
                ================================================= */}

                <div className="mt-7 border-t border-slate-100 pt-5">

                  <button
                    type="button"
                    onClick={
                      deleteProduct
                    }
                    className="mb-15 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.99]"
                  >
                    <Trash2
                      size={17}
                    />
                    Delete Product
                  </button>

                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  text,
  icon,
  dark = false,
  danger = false,
  wide = false,
}) {
  return (
    <div
      className={`${
        wide
          ? "col-span-2 sm:col-span-1"
          : ""
      } rounded-3xl p-5 ${
        dark
          ? "bg-slate-950 text-white shadow-xl"
          : danger
          ? "border border-red-100 bg-red-50"
          : "border border-amber-100 bg-amber-50"
      }`}
    >

      <div
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
          dark
            ? "text-violet-300"
            : danger
            ? "text-red-600"
            : "text-amber-600"
        }`}
      >
        {icon}
        {title}
      </div>

      <p
        className={`mt-4 text-3xl font-bold ${
          dark
            ? "text-white"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          dark
            ? "text-slate-400"
            : "text-slate-500"
        }`}
      >
        {text}
      </p>

    </div>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">

      <div className="flex items-center gap-2 text-violet-600">
        {icon}

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   EDIT FIELD
========================================================= */

function EditField({
  label,
  name,
  value,
  onChange,
  type = "text",
  icon,
}) {
  return (
    <label className="block">

      <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">

        <span className="text-violet-600">
          {icon}
        </span>

        {label}

      </span>

      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />

    </label>
  );
}

export default Product;
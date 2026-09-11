import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Pencil,
  Package,
  Share2,
  ShieldCheck,
  Trash2,
  X,
  Check,
  AlertCircle,
  Clock3,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

const WARRANTY_STORAGE_KEY =
  "warranty_vault_warranties";

function ProductDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] =
    useState(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [editData, setEditData] =
    useState({});

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [isSaved, setIsSaved] =
    useState(false);

  /*
  ============================================================
  LOAD PRODUCT
  ============================================================
  */

  useEffect(() => {
    loadProduct();
  }, [id]);

  /*
  ============================================================
  FIND PRODUCT FROM LOCAL STORAGE
  ============================================================
  */

  const loadProduct = () => {
    try {
      const stored =
        localStorage.getItem(
          WARRANTY_STORAGE_KEY
        );

      if (!stored) {
        setProduct(null);
        return;
      }

      const parsed =
        JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        setProduct(null);
        return;
      }

      const normalized =
        parsed.map(
          (item, index) => ({
            ...item,
            id:
              item.id ||
              `warranty-${item.savedAt || index}`,
          })
        );

      const found =
        normalized.find(
          (item) =>
            String(item.id) ===
            String(id)
        );

      if (!found) {
        setProduct(null);
        return;
      }

      setProduct(found);
      setEditData(found);
    } catch (error) {
      console.error(
        "Unable to load product:",
        error
      );

      setProduct(null);
    }
  };

  /*
  ============================================================
  GET PRODUCT NAME
  ============================================================
  */

  const getProductName = () => {
    return (
      product?.productName ||
      product?.name ||
      "Unnamed Product"
    );
  };

  /*
  ============================================================
  WARRANTY INFORMATION
  ============================================================
  */

  const getWarrantyInfo = () => {
    if (
      !product?.warrantyEndDate
    ) {
      return {
        daysLeft: 0,
        status: "Unknown",
        type: "unknown",
      };
    }

    const end = new Date(
      `${product.warrantyEndDate}T00:00:00`
    );

    if (Number.isNaN(end.getTime())) {
      return {
        daysLeft: 0,
        status: "Unknown",
        type: "unknown",
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const difference =
      end.getTime() -
      today.getTime();

    const daysLeft = Math.ceil(
      difference /
        (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      return {
        daysLeft,
        status: "Expired",
        type: "expired",
      };
    }

    if (daysLeft <= 3) {
      return {
        daysLeft,
        status: "Ending Soon",
        type: "urgent",
      };
    }

    if (daysLeft <= 30) {
      return {
        daysLeft,
        status: "Ending Soon",
        type: "warning",
      };
    }

    return {
      daysLeft,
      status: "Active",
      type: "active",
    };
  };

  /*
  ============================================================
  FORMAT DATE
  ============================================================
  */

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    const value = new Date(
      `${date}T00:00:00`
    );

    if (Number.isNaN(value.getTime())) {
      return date;
    }

    return value.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  };

  /*
  ============================================================
  EDIT FIELD
  ============================================================
  */

  const handleEditChange = (
    field,
    value
  ) => {
    setEditData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /*
  ============================================================
  SAVE EDIT
  ============================================================
  */

  const handleSaveEdit = () => {
    try {
      const stored =
        localStorage.getItem(
          WARRANTY_STORAGE_KEY
        );

      const parsed =
        stored
          ? JSON.parse(stored)
          : [];

      if (!Array.isArray(parsed)) {
        return;
      }

      const updated =
        parsed.map((item) => {
          const itemId =
            item.id;

          if (
            String(itemId) !==
            String(product.id)
          ) {
            return item;
          }

          return {
            ...item,
            ...editData,
            id: product.id,
            savedAt:
              item.savedAt ||
              new Date().toISOString(),
            updatedAt:
              new Date().toISOString(),
          };
        });

      localStorage.setItem(
        WARRANTY_STORAGE_KEY,
        JSON.stringify(updated)
      );

      const updatedProduct =
        updated.find(
          (item) =>
            String(item.id) ===
            String(product.id)
        );

      setProduct(updatedProduct);
      setEditData(updatedProduct);

      setIsEditing(false);
      setIsSaved(true);

      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Unable to update product:",
        error
      );
    }
  };

  /*
  ============================================================
  DELETE PRODUCT
  ============================================================
  */

  const handleDelete = () => {
    try {
      const stored =
        localStorage.getItem(
          WARRANTY_STORAGE_KEY
        );

      const parsed =
        stored
          ? JSON.parse(stored)
          : [];

      if (!Array.isArray(parsed)) {
        return;
      }

      const updated =
        parsed.filter(
          (item) =>
            String(item.id) !==
            String(product.id)
        );

      localStorage.setItem(
        WARRANTY_STORAGE_KEY,
        JSON.stringify(updated)
      );

      setShowDeleteConfirm(false);

      navigate("/products", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Unable to delete product:",
        error
      );
    }
  };

  /*
  ============================================================
  BACK
  ============================================================
  */

  const handleBack = () => {
    if (isEditing) {
      setEditData(product);
      setIsEditing(false);
      return;
    }

    navigate("/products");
  };

  /*
  ============================================================
  PRODUCT NOT FOUND
  ============================================================
  */

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 pb-32">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package size={30} />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Product not found
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              This warranty may have been
              removed or is no longer available.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/products")
              }
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
            >
              <ArrowLeft size={17} />
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  const warranty =
    getWarrantyInfo();

  const isExpired =
    warranty.type === "expired";

  const isEnding =
    warranty.type === "urgent" ||
    warranty.type === "warning";

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="mx-auto w-full max-w-5xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-slate-50/90 px-5 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="min-w-0 text-center">
              <p className="text-sm font-bold text-slate-900">
                Product Details
              </p>

              <p className="truncate text-[11px] text-slate-400">
                Warranty protection
              </p>
            </div>

            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 active:scale-95"
              aria-label="Share"
            >
              <Share2 size={19} />
            </button>
          </div>
        </header>

        {/* ==================================================
            MAIN
        ================================================== */}

        <main className="px-5 sm:px-7 lg:px-10">
          {/* ==================================================
              PRODUCT HERO
          ================================================== */}

          <section className="pt-7 sm:pt-9">
            <div className="relative overflow-hidden rounded-[32px] bg-slate-950 p-6 shadow-xl sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

              <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-500/30">
                    <Package size={30} />
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      isExpired
                        ? "bg-red-500/15 text-red-300"
                        : isEnding
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isExpired ? (
                      <AlertCircle size={14} />
                    ) : (
                      <ShieldCheck size={14} />
                    )}

                    {warranty.status}
                  </div>
                </div>

                <p className="mt-7 break-words text-2xl font-bold text-white sm:text-3xl">
                  {getProductName()}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {product.brand ||
                    "Brand not detected"}{" "}
                  •{" "}
                  {product.category ||
                    "Other"}
                </p>

                {/* WARRANTY SUMMARY */}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock3 size={16} />

                      <span className="text-xs">
                        Warranty
                      </span>
                    </div>

                    <p
                      className={`mt-2 text-xl font-bold ${
                        isExpired
                          ? "text-red-300"
                          : isEnding
                          ? "text-amber-300"
                          : "text-violet-300"
                      }`}
                    >
                      {isExpired
                        ? "Expired"
                        : `${warranty.daysLeft} days`}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      {isExpired
                        ? `Ended ${formatDate(
                            product.warrantyEndDate
                          )}`
                        : "remaining"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarDays size={16} />

                      <span className="text-xs">
                        Ends
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-bold text-white">
                      {formatDate(
                        product.warrantyEndDate
                      )}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Warranty end date
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              EDIT MODE
          ================================================== */}

          {isEditing ? (
            <section className="pt-8">
              <div className="rounded-[30px] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                      Edit information
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Update Product
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Change the information below and
                      save your updates.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditData(product);
                      setIsEditing(false);
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* PRODUCT NAME */}

                  <EditField
                    label="Product Name"
                    value={
                      editData.productName ||
                      editData.name ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "productName",
                        value
                      )
                    }
                    placeholder="Product name"
                  />

                  {/* BRAND */}

                  <EditField
                    label="Brand"
                    value={
                      editData.brand ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "brand",
                        value
                      )
                    }
                    placeholder="Brand"
                  />

                  {/* CATEGORY */}

                  <EditField
                    label="Category"
                    value={
                      editData.category ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "category",
                        value
                      )
                    }
                    placeholder="Category"
                  />

                  {/* PURCHASE DATE */}

                  <EditField
                    label="Purchase Date"
                    type="date"
                    value={
                      editData.purchaseDate ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "purchaseDate",
                        value
                      )
                    }
                  />

                  {/* WARRANTY START */}

                  <EditField
                    label="Warranty Start Date"
                    type="date"
                    value={
                      editData.warrantyStartDate ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "warrantyStartDate",
                        value
                      )
                    }
                  />

                  {/* WARRANTY DURATION */}

                  <EditField
                    label="Warranty Duration"
                    value={
                      editData.warrantyDuration ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "warrantyDuration",
                        value
                      )
                    }
                    placeholder="Example: 2 Years"
                  />

                  {/* WARRANTY END */}

                  <EditField
                    label="Warranty End Date"
                    type="date"
                    value={
                      editData.warrantyEndDate ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "warrantyEndDate",
                        value
                      )
                    }
                  />

                  {/* INVOICE */}

                  <EditField
                    label="Invoice Number"
                    value={
                      editData.invoiceNumber ||
                      ""
                    }
                    onChange={(value) =>
                      handleEditChange(
                        "invoiceNumber",
                        value
                      )
                    }
                    placeholder="Invoice number"
                  />
                </div>

                {/* SAVE / CANCEL */}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-[0.98]"
                  >
                    <Check size={18} />
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditData(product);
                      setIsEditing(false);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* ==================================================
                  WARRANTY INFORMATION
              ================================================== */}

              <section className="pt-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays
                      size={18}
                      className="text-violet-600"
                    />

                    <h2 className="text-lg font-bold text-slate-900">
                      Warranty Information
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsEditing(true)
                    }
                    className="flex items-center gap-1.5 rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-200 active:scale-95"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <InfoRow
                    label="Product Name"
                    value={getProductName()}
                  />

                  <InfoRow
                    label="Brand"
                    value={
                      product.brand ||
                      "Not available"
                    }
                  />

                  <InfoRow
                    label="Category"
                    value={
                      product.category ||
                      "Other"
                    }
                  />

                  <InfoRow
                    label="Purchase Date"
                    value={formatDate(
                      product.purchaseDate
                    )}
                  />

                  <InfoRow
                    label="Warranty Start Date"
                    value={formatDate(
                      product.warrantyStartDate
                    )}
                  />

                  <InfoRow
                    label="Warranty Duration"
                    value={
                      product.warrantyDuration ||
                      "Not available"
                    }
                  />

                  <InfoRow
                    label="Warranty End Date"
                    value={formatDate(
                      product.warrantyEndDate
                    )}
                  />

                  <InfoRow
                    label="Invoice Number"
                    value={
                      product.invoiceNumber ||
                      "Not available"
                    }
                    isLast
                  />
                </div>
              </section>

              {/* ==================================================
                  DOCUMENT
              ================================================== */}

              <section className="pt-8">
                <div className="flex items-center gap-2">
                  <FileText
                    size={18}
                    className="text-violet-600"
                  />

                  <h2 className="text-lg font-bold text-slate-900">
                    Original Document
                  </h2>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                      <FileText size={25} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        Original warranty document
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Securely stored
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
                    >
                      <FileText size={17} />
                      View
                    </button>

                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
                    >
                      <Download size={17} />
                      Download
                    </button>
                  </div>
                </div>
              </section>

              {/* ==================================================
                  MANAGE PRODUCT
              ================================================== */}

              <section className="pt-8">
                <h2 className="text-lg font-bold text-slate-900">
                  Manage Product
                </h2>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      setIsEditing(true)
                    }
                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-violet-200 hover:bg-violet-50 active:scale-[0.99]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                      <Pencil size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        Edit Product
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Update product or warranty details
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDeleteConfirm(
                        true
                      )
                    }
                    className="flex w-full items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-left transition hover:bg-red-100 active:scale-[0.99]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <Trash2 size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-red-700">
                        Delete Product
                      </p>

                      <p className="mt-1 text-xs text-red-500">
                        Remove this warranty permanently
                      </p>
                    </div>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ==================================================
              SAVED MESSAGE
          ================================================== */}

          {isSaved && (
            <div className="fixed bottom-28 left-1/2 z-[150] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-2xl">
              <Check
                size={17}
                className="text-emerald-400"
              />

              Changes saved successfully
            </div>
          )}
        </main>

        {/* ==================================================
            DELETE CONFIRMATION
        ================================================== */}

        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-[200] flex items-end bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"
            onClick={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowDeleteConfirm(
                  false
                );
              }
            }}
          >
            <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl sm:p-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <Trash2 size={25} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Delete this product?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This will remove{" "}
                <span className="font-semibold text-slate-700">
                  {getProductName()}
                </span>{" "}
                and its warranty information from
                your Products list.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 active:scale-[0.98]"
                >
                  <Trash2 size={17} />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirm(
                      false
                    )
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 active:scale-[0.98]"
                >
                  <X size={17} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
============================================================
INFO ROW
============================================================
*/

function InfoRow({
  label,
  value,
  isLast = false,
}) {
  return (
    <div
      className={`flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${
        !isLast
          ? "border-b border-slate-100"
          : ""
      }`}
    >
      <p className="text-xs font-medium text-slate-500 sm:text-sm">
        {label}
      </p>

      <p className="break-words text-sm font-semibold text-slate-900 sm:max-w-[60%] sm:text-right">
        {value}
      </p>
    </div>
  );
}

/*
============================================================
EDIT FIELD
============================================================
*/

function EditField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value || ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

export default ProductDetails;
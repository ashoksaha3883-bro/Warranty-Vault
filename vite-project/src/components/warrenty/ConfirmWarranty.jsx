import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Package,
  Receipt,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  MapPin,
  Phone,
  Clock3,
  AlertCircle,
  Save,
  Check,
} from "lucide-react";

function ConfirmWarranty({ file, onBack, onSave }) {
  const [formData, setFormData] = useState({
    productName: "",
    brand: "",
    modelNumber: "",
    serialNumber: "",
    purchaseDate: "",
    warrantyStartDate: "",
    warrantyDuration: "",
    warrantyEndDate: "",
    seller: "",
    invoiceNumber: "",
    warrantyType: "",
    category: "",
    placeOfSupply: "",
    contact: "",
  });

  const [products, setProducts] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [manualEndDate, setManualEndDate] = useState(false);

  const isPDF = file?.type === "application/pdf";

  /*
  ============================================================
  IMAGE PREVIEW
  ============================================================
  */

  useEffect(() => {
    if (!file || isPDF) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, isPDF]);

  /*
  ============================================================
  SCAN WARRANTY
  ============================================================
  */

  useEffect(() => {
    if (!file) {
      setLoading(false);
      setError("No warranty document was selected.");
      return;
    }

    let cancelled = false;

    const scanWarranty = async () => {
      try {
        setLoading(true);
        setError("");

        const data = new FormData();

        data.append("warranty", file);

        const response = await fetch(
          "http://localhost:5000/api/warranty/scan",
          {
            method: "POST",
            body: data,
          }
        );

        let result;

        try {
          result = await response.json();
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }

        console.log("=================================");
        console.log("FULL WARRANTY API RESPONSE");
        console.log(result);
        console.log("=================================");

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message ||
              "Unable to scan warranty document."
          );
        }

        const normalized =
          normalizeWarrantyResponse(result);

        console.log("=================================");
        console.log("NORMALIZED WARRANTY DATA");
        console.log(normalized);
        console.log("=================================");

        if (cancelled) {
          return;
        }

        /*
        ========================================================
        RAW OCR TEXT
        ========================================================
        */

        setRawText(normalized.rawText);

        /*
        ========================================================
        NORMALIZE ALL DATES
        ========================================================
        */

        const purchaseDate =
          normalizeDate(
            normalized.purchaseDate
          );

        const warrantyStartDate =
          normalizeDate(
            normalized.warrantyStartDate ||
              purchaseDate
          );

        const detectedEndDate =
          normalizeDate(
            normalized.warrantyEndDate
          );

        /*
        ========================================================
        WARRANTY INFORMATION
        ========================================================
        */

        setFormData({
          productName:
            normalized.productName,

          brand:
            normalized.brand,

          modelNumber:
            normalized.modelNumber,

          serialNumber:
            normalized.serialNumber,

          purchaseDate,

          warrantyStartDate,

          warrantyDuration:
            normalized.warrantyDuration,

          warrantyEndDate:
            detectedEndDate,

          seller:
            normalized.seller,

          invoiceNumber:
            normalized.invoiceNumber,

          warrantyType:
            normalized.warrantyType,

          category:
            normalizeCategory(
              normalized.category
            ),

          placeOfSupply:
            normalized.placeOfSupply,

          contact:
            normalized.contact,
        });

        /*
        If AI detected a real end date,
        remember that it came from the document.
        */

        setManualEndDate(
          Boolean(detectedEndDate)
        );

        /*
        ========================================================
        PRODUCTS
        ========================================================
        */

        setProducts(
          Array.isArray(normalized.products)
            ? normalized.products
            : []
        );

        /*
        ========================================================
        DEBUG
        ========================================================
        */

        console.log(
          "Product Name:",
          normalized.productName
        );

        console.log(
          "Brand:",
          normalized.brand
        );

        console.log(
          "Model:",
          normalized.modelNumber
        );

        console.log(
          "Invoice:",
          normalized.invoiceNumber
        );

        console.log(
          "Purchase Date:",
          purchaseDate
        );

        console.log(
          "Warranty Start:",
          warrantyStartDate
        );

        console.log(
          "Warranty Duration:",
          normalized.warrantyDuration
        );

        console.log(
          "Warranty End:",
          detectedEndDate
        );

        console.log(
          "Serial:",
          normalized.serialNumber
        );
      } catch (scanError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Warranty scan error:",
          scanError
        );

        setError(
          scanError?.message ||
            "Unable to scan warranty document."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    scanWarranty();

    return () => {
      cancelled = true;
    };
  }, [file]);

  /*
  ============================================================
  UPDATE FIELD
  ============================================================
  */

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  };

  /*
  ============================================================
  CALCULATE WARRANTY END DATE
  ============================================================
  */

  const calculatedEndDate = useMemo(() => {
    if (
      !formData.warrantyStartDate ||
      !formData.warrantyDuration
    ) {
      return "";
    }

    const date = parseLocalDate(
      normalizeDate(
        formData.warrantyStartDate
      )
    );

    if (!date) {
      return "";
    }

    const duration =
      String(
        formData.warrantyDuration
      )
        .trim()
        .toLowerCase();

    const numberMatch =
      duration.match(
        /\d+(?:\.\d+)?/
      );

    if (!numberMatch) {
      return "";
    }

    const amount = Number(
      numberMatch[0]
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return "";
    }

    /*
    ------------------------------------------------------------
    YEARS
    ------------------------------------------------------------
    */

    if (duration.includes("year")) {
      const wholeYears =
        Math.floor(amount);

      const decimalYears =
        amount - wholeYears;

      date.setFullYear(
        date.getFullYear() +
          wholeYears
      );

      if (decimalYears > 0) {
        date.setMonth(
          date.getMonth() +
            Math.round(
              decimalYears * 12
            )
        );
      }
    }

    /*
    ------------------------------------------------------------
    MONTHS
    ------------------------------------------------------------
    */

    else if (
      duration.includes("month")
    ) {
      const wholeMonths =
        Math.floor(amount);

      const decimalMonths =
        amount - wholeMonths;

      date.setMonth(
        date.getMonth() +
          wholeMonths
      );

      if (decimalMonths > 0) {
        date.setDate(
          date.getDate() +
            Math.round(
              decimalMonths * 30
            )
        );
      }
    }

    /*
    ------------------------------------------------------------
    DAYS
    ------------------------------------------------------------
    */

    else if (
      duration.includes("day")
    ) {
      date.setDate(
        date.getDate() + amount
      );
    } else {
      return "";
    }

    return formatDateForInput(date);
  }, [
    formData.warrantyStartDate,
    formData.warrantyDuration,
  ]);

  /*
  ============================================================
  FINAL END DATE
  ============================================================
  */

  const displayEndDate =
    manualEndDate &&
    formData.warrantyEndDate
      ? normalizeDate(
          formData.warrantyEndDate
        )
      : calculatedEndDate ||
        normalizeDate(
          formData.warrantyEndDate
        );

  /*
  ============================================================
  AUTO UPDATE END DATE
  ============================================================
  */

  useEffect(() => {
    if (
      !manualEndDate &&
      calculatedEndDate
    ) {
      setFormData((previous) => ({
        ...previous,
        warrantyEndDate:
          calculatedEndDate,
      }));
    }
  }, [
    calculatedEndDate,
    manualEndDate,
  ]);

  /*
  ============================================================
  DAYS REMAINING
  ============================================================
  */

  const warrantyStatus = useMemo(() => {
    if (!displayEndDate) {
      return {
        daysLeft: null,
        status: "unknown",
      };
    }

    const endDate =
      parseLocalDate(displayEndDate);

    if (!endDate) {
      return {
        daysLeft: null,
        status: "unknown",
      };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    endDate.setHours(0, 0, 0, 0);

    const difference =
      endDate.getTime() -
      today.getTime();

    const daysLeft = Math.ceil(
      difference /
        (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      return {
        daysLeft: Math.abs(daysLeft),
        status: "expired",
      };
    }

    if (daysLeft <= 7) {
      return {
        daysLeft,
        status: "urgent",
      };
    }

    if (daysLeft <= 30) {
      return {
        daysLeft,
        status: "soon",
      };
    }

    return {
      daysLeft,
      status: "active",
    };
  }, [displayEndDate]);

  /*
  ============================================================
  REQUIRED FIELD VALIDATION
  ============================================================
  */

  const requiredFields = useMemo(() => {
    return {
      productName:
        Boolean(
          formData.productName.trim()
        ),

      purchaseDate:
        Boolean(
          normalizeDate(
            formData.purchaseDate
          )
        ),

      warrantyStartDate:
        Boolean(
          normalizeDate(
            formData.warrantyStartDate
          )
        ),

      warrantyEndDate:
        Boolean(
          normalizeDate(displayEndDate)
        ),

      category:
        Boolean(
          formData.category &&
            formData.category.trim()
        ),
    };
  }, [
    formData.productName,
    formData.purchaseDate,
    formData.warrantyStartDate,
    formData.category,
    displayEndDate,
  ]);

  const allRequiredFieldsValid =
    Object.values(
      requiredFields
    ).every(Boolean);

  /*
  ============================================================
  SAVE WARRANTY
  ============================================================
  */

  const handleSave = () => {
    setError("");

    const productName =
      formData.productName.trim();

    const purchaseDate =
      normalizeDate(
        formData.purchaseDate
      );

    const warrantyStartDate =
      normalizeDate(
        formData.warrantyStartDate
      );

    const warrantyEndDate =
      normalizeDate(displayEndDate);

    const category =
      formData.category.trim();

    /*
    ------------------------------------------------------------
    PRODUCT NAME
    ------------------------------------------------------------
    */

    if (!productName) {
      setError(
        "Product Name is required. Please enter the product name."
      );
      return;
    }

    /*
    ------------------------------------------------------------
    PURCHASE DATE
    ------------------------------------------------------------
    */

    if (!purchaseDate) {
      setError(
        "Purchase Date is required. Please select the purchase date."
      );
      return;
    }

    /*
    ------------------------------------------------------------
    WARRANTY START
    ------------------------------------------------------------
    */

    if (!warrantyStartDate) {
      setError(
        "Warranty Start Date is required. Please select the warranty start date."
      );
      return;
    }

    /*
    ------------------------------------------------------------
    CATEGORY
    ------------------------------------------------------------
    */

    if (!category) {
      setError(
        "Category is required. Please select a category."
      );
      return;
    }

    /*
    ------------------------------------------------------------
    WARRANTY END
    ------------------------------------------------------------
    */

    if (!warrantyEndDate) {
      setError(
        "Warranty End Date is required. Enter a warranty duration or select the end date manually."
      );
      return;
    }

    /*
    ------------------------------------------------------------
    FINAL VALIDATION
    ------------------------------------------------------------
    */

    if (
      !parseLocalDate(
        purchaseDate
      )
    ) {
      setError(
        "Purchase Date is invalid."
      );
      return;
    }

    if (
      !parseLocalDate(
        warrantyStartDate
      )
    ) {
      setError(
        "Warranty Start Date is invalid."
      );
      return;
    }

    if (
      !parseLocalDate(
        warrantyEndDate
      )
    ) {
      setError(
        "Warranty End Date is invalid."
      );
      return;
    }

    /*
    ============================================================
    FINAL DATA
    ============================================================
    */

    const warrantyData = {
      ...formData,

      productName,

      purchaseDate,

      warrantyStartDate,

      warrantyEndDate,

      category,

      daysLeft:
        warrantyStatus.status ===
        "expired"
          ? 0
          : warrantyStatus.daysLeft,

      warrantyStatus:
        warrantyStatus.status,

      products,

      file,

      rawText,
    };

    console.log(
      "================================="
    );

    console.log(
      "SAVING FINAL WARRANTY"
    );

    console.log(
      warrantyData
    );

    console.log(
      "================================="
    );

    onSave(warrantyData);
  };

  /*
  ============================================================
  RENDER
  ============================================================
  */

  return (
    <div className="fixed inset-0 z-[400] h-[100dvh] w-screen overflow-y-auto bg-[#f5f8f8]">

      <div className="mx-auto min-h-[100dvh] w-full max-w-6xl pb-10">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f5f8f8]/95 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">

          <div className="mx-auto flex max-w-6xl items-center justify-between">

            <button
              type="button"
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="text-center">

              <p className="text-[15px] font-bold text-slate-900 sm:text-base">
                Confirm Warranty
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Review before saving
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <ShieldCheck size={21} />
            </div>

          </div>

        </header>

        <main className="px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">

          {/* ==================================================
              SCAN STATUS
          ================================================== */}

          <section>

            <div className="rounded-[28px] border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-5 sm:p-6">

              <div className="flex gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200">
                  <Sparkles size={21} />
                </div>

                <div>

                  <p className="font-bold text-slate-900">
                    {loading
                      ? "Scanning your document..."
                      : "Smart scan completed"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {loading
                      ? "Please wait while we read your warranty document."
                      : "AI detected the information below. Missing information can be entered manually."}
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="mt-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>

                <p className="text-sm font-semibold text-red-700">
                  {error}
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  Please complete the required information before saving.
                </p>

              </div>

            </div>
          )}

          {/* ==================================================
              MAIN RESPONSIVE LAYOUT
          ================================================== */}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">

            {/* ==================================================
                LEFT COLUMN
            ================================================== */}

            <div className="space-y-6">

              {/* ==================================================
                  YOUR DOCUMENT
              ================================================== */}

              <section>

                <div className="mb-3 flex items-center justify-between">

                  <p className="text-lg font-bold text-slate-900">
                    Your document
                  </p>

                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      loading
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >

                    <CheckCircle2 size={14} />

                    {loading
                      ? "Scanning"
                      : "Ready"}

                  </div>

                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

                  {isPDF ? (
                    <div className="flex h-64 flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50">

                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500">
                        <FileText size={32} />
                      </div>

                      <p className="mt-4 text-sm font-bold text-slate-900">
                        Warranty document
                      </p>

                      <p className="mt-1 max-w-[250px] truncate px-4 text-xs text-slate-500">
                        {file?.name}
                      </p>

                    </div>
                  ) : (
                    <div className="h-64 bg-slate-100 sm:h-72">

                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Uploaded warranty document"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FileText
                            size={32}
                            className="text-slate-400"
                          />
                        </div>
                      )}

                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                      <FileText size={19} />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-slate-900">
                        {file?.name ||
                          "Warranty document"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Original uploaded document
                      </p>

                    </div>

                  </div>

                </div>

              </section>

              {/* ==================================================
                  REQUIRED INFORMATION STATUS
              ================================================== */}

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <div className="flex items-start gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                    <Check size={21} />
                  </div>

                  <div>

                    <p className="font-bold text-slate-900">
                      Required information
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      AI fills these automatically when detected. You can enter anything missing manually.
                    </p>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <RequiredStatus
                    label="Product Name"
                    complete={
                      requiredFields.productName
                    }
                  />

                  <RequiredStatus
                    label="Purchase Date"
                    complete={
                      requiredFields.purchaseDate
                    }
                  />

                  <RequiredStatus
                    label="Warranty Start"
                    complete={
                      requiredFields.warrantyStartDate
                    }
                  />

                  <RequiredStatus
                    label="Warranty End"
                    complete={
                      requiredFields.warrantyEndDate
                    }
                  />

                  <RequiredStatus
                    label="Category"
                    complete={
                      requiredFields.category
                    }
                  />

                </div>

              </section>

            </div>

            {/* ==================================================
                RIGHT COLUMN
            ================================================== */}

            <div>

              {/* ==================================================
                  WARRANTY INFORMATION
              ================================================== */}

              <section>

                <div className="mb-4 flex items-center justify-between">

                  <div>

                    <p className="text-lg font-bold text-slate-900">
                      Warranty information
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      AI detected information
                    </p>

                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                    <Edit3 size={18} />
                  </div>

                </div>

                <div className="space-y-4">

                  {/* PRODUCT NAME */}

                  <InputCard
                    label="Product Name"
                    icon={<Package size={17} />}
                    value={
                      formData.productName
                    }
                    onChange={(value) =>
                      updateField(
                        "productName",
                        value
                      )
                    }
                    placeholder="Enter product name"
                    required
                  />

                  {/* BRAND + MODEL */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <InputCard
                      label="Brand"
                      icon={<Tag size={16} />}
                      value={
                        formData.brand
                      }
                      onChange={(value) =>
                        updateField(
                          "brand",
                          value
                        )
                      }
                      placeholder="AI detected brand"
                    />

                    <InputCard
                      label="Model"
                      icon={
                        <Package size={16} />
                      }
                      value={
                        formData.modelNumber
                      }
                      onChange={(value) =>
                        updateField(
                          "modelNumber",
                          value
                        )
                      }
                      placeholder="AI detected model"
                    />

                  </div>

                  {/* INVOICE */}

                  <InputCard
                    label="Invoice Number"
                    icon={
                      <Receipt size={17} />
                    }
                    value={
                      formData.invoiceNumber
                    }
                    onChange={(value) =>
                      updateField(
                        "invoiceNumber",
                        value
                      )
                    }
                    placeholder="AI detected invoice number"
                  />

                  {/* PURCHASE DATE + CATEGORY */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <DateInputCard
                      label="Purchase Date"
                      value={
                        formData.purchaseDate
                      }
                      onChange={(value) =>
                        updateField(
                          "purchaseDate",
                          value
                        )
                      }
                      required
                    />

                    <CategoryInput
                      value={
                        formData.category
                      }
                      onChange={(value) =>
                        updateField(
                          "category",
                          value
                        )
                      }
                      required
                    />

                  </div>

                  {/* WARRANTY START + DURATION */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <DateInputCard
                      label="Warranty Start"
                      value={
                        formData.warrantyStartDate
                      }
                      onChange={(value) =>
                        updateField(
                          "warrantyStartDate",
                          value
                        )
                      }
                      required
                    />

                    <InputCard
                      label="Duration"
                      icon={
                        <Clock3 size={17} />
                      }
                      value={
                        formData.warrantyDuration
                      }
                      onChange={(value) =>
                        updateField(
                          "warrantyDuration",
                          value
                        )
                      }
                      placeholder="Example: 1 Year"
                    />

                  </div>

                  {/* WARRANTY END */}

                  <div>

                    <div className="mb-2 flex items-center justify-between">

                      <label className="flex items-center gap-2 text-sm font-bold text-slate-800">

                        <CalendarDays
                          size={17}
                          className="text-teal-700"
                        />

                        Warranty End Date

                        <span className="text-red-500">
                          *
                        </span>

                      </label>

                      {calculatedEndDate &&
                        !manualEndDate && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            Auto calculated
                          </span>
                        )}

                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                          <ShieldCheck size={19} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <input
                            type="date"
                            value={
                              normalizeDate(
                                displayEndDate
                              )
                            }
                            onChange={(event) => {
                              const value =
                                event.target
                                  .value;

                              setManualEndDate(
                                Boolean(value)
                              );

                              updateField(
                                "warrantyEndDate",
                                normalizeDate(
                                  value
                                )
                              );
                            }}
                            className="w-full cursor-pointer bg-transparent text-sm font-bold text-slate-900 outline-none"
                          />

                          <p className="mt-1 text-xs text-emerald-700">

                            {calculatedEndDate &&
                            !manualEndDate
                              ? "Automatically calculated from warranty duration"
                              : "Select the warranty end date manually"}

                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* DATE TRACKER */}

                  {displayEndDate &&
                    warrantyStatus.daysLeft !==
                      null && (
                      <WarrantyTracker
                        status={
                          warrantyStatus.status
                        }
                        daysLeft={
                          warrantyStatus.daysLeft
                        }
                        endDate={
                          displayEndDate
                        }
                      />
                    )}

                  {/* SERIAL NUMBER */}

                  <InputCard
                    label="Serial Number"
                    icon={
                      <ShieldCheck
                        size={17}
                      />
                    }
                    value={
                      formData.serialNumber
                    }
                    onChange={(value) =>
                      updateField(
                        "serialNumber",
                        value
                      )
                    }
                    placeholder="AI detected serial number"
                  />

                  {/* MORE INFORMATION */}

                  <div className="pt-4">

                    <div className="mb-4">

                      <p className="text-base font-bold text-slate-900">
                        More information
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Seller, warranty type and contact
                      </p>

                    </div>

                    <div className="space-y-4">

                      <InputCard
                        label="Seller / Retailer"
                        icon={
                          <Store size={17} />
                        }
                        value={
                          formData.seller
                        }
                        onChange={(value) =>
                          updateField(
                            "seller",
                            value
                          )
                        }
                        placeholder="AI detected seller"
                      />

                      <InputCard
                        label="Warranty Type"
                        icon={
                          <Shield size={17} />
                        }
                        value={
                          formData.warrantyType
                        }
                        onChange={(value) =>
                          updateField(
                            "warrantyType",
                            value
                          )
                        }
                        placeholder="Manufacturer / Seller / Extended"
                      />

                      <InputCard
                        label="Place of Supply"
                        icon={
                          <MapPin size={17} />
                        }
                        value={
                          formData.placeOfSupply
                        }
                        onChange={(value) =>
                          updateField(
                            "placeOfSupply",
                            value
                          )
                        }
                        placeholder="City / State / Country"
                      />

                      <InputCard
                        label="Contact"
                        icon={
                          <Phone size={17} />
                        }
                        value={
                          formData.contact
                        }
                        onChange={(value) =>
                          updateField(
                            "contact",
                            value
                          )
                        }
                        placeholder="AI detected contact"
                      />

                    </div>

                  </div>

                </div>

              </section>

              {/* ==================================================
                  DETECTED PRODUCTS
              ================================================== */}

              {products.length > 0 && (
                <section className="mt-8">

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="text-lg font-bold text-slate-900">
                          Detected products
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {products.length}{" "}
                          {products.length === 1
                            ? "product"
                            : "products"}{" "}
                          detected
                        </p>

                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                        <Package size={21} />
                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowProducts(
                          (previous) =>
                            !previous
                        )
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-900 transition hover:bg-slate-100 active:scale-[0.98]"
                    >

                      {showProducts
                        ? "Hide products"
                        : "View products"}

                      {showProducts ? (
                        <ChevronUp
                          size={18}
                        />
                      ) : (
                        <ChevronDown
                          size={18}
                        />
                      )}

                    </button>

                    {showProducts && (
                      <div className="mt-5 space-y-3">

                        {products.map(
                          (
                            product,
                            index
                          ) => (
                            <ProductCard
                              key={`${product?.productName || product?.name || "product"}-${index}`}
                              product={
                                product
                              }
                              index={
                                index
                              }
                            />
                          )
                        )}

                      </div>
                    )}

                  </div>

                </section>
              )}

              {/* ==================================================
                  COMPLETE OCR
              ================================================== */}

              {rawText && (
                <section className="mt-6">

                  <details className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">

                    <summary className="cursor-pointer list-none p-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <FileText size={18} />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-bold text-slate-900">
                            View complete OCR text
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Complete information read from your uploaded document.
                          </p>

                        </div>

                        <ChevronDown
                          size={18}
                          className="shrink-0 text-slate-400"
                        />

                      </div>

                    </summary>

                    <div className="border-t border-slate-100 p-5">

                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
                        {rawText}
                      </pre>

                    </div>

                  </details>

                </section>
              )}

              {/* ==================================================
                  SAVE
              ================================================== */}

              <div className="mt-7">

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    loading ||
                    !allRequiredFieldsValid
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white shadow-xl shadow-slate-300 transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >

                  <Save size={19} />

                  {loading
                    ? "Scanning..."
                    : "Save Warranty"}

                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-500">

                  {allRequiredFieldsValid
                    ? "Everything required is ready to save."
                    : "Complete the required fields above to save this warranty."}

                </p>

              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

/*
============================================================
NORMALIZE BACKEND RESPONSE
============================================================
*/

function normalizeWarrantyResponse(result) {
  const data =
    result?.data &&
    typeof result.data === "object"
      ? result.data
      : {};

  const candidates = [
    data?.extractedData,
    data?.extracted,
    data?.warranty,
    data?.warrantyData,
    data?.result,

    result?.extractedData,
    result?.extracted,
    result?.warranty,
    result?.warrantyData,

    data,
    result,
  ];

  const source =
    candidates.find(
      (item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
    ) || {};

  let products = firstArray(
    source.products,
    data.products,
    result.products,
    source.detectedProducts,
    data.detectedProducts,
    result.detectedProducts
  );

  if (
    products.length === 0 &&
    source.product &&
    typeof source.product === "object" &&
    !Array.isArray(source.product)
  ) {
    products = [source.product];
  }

  const firstProduct =
    products[0] || {};

  const productName = cleanValue(
    findValue(source, [
      "productName",
      "product_name",
      "itemName",
      "item_name",
      "productTitle",
      "product_title",
      "description",
      "name",
    ]) ||
      findValue(firstProduct, [
        "productName",
        "product_name",
        "itemName",
        "item_name",
        "productTitle",
        "product_title",
        "description",
        "name",
      ]) ||
      findValue(data, [
        "productName",
        "product_name",
        "itemName",
        "item_name",
        "name",
      ])
  );

  const brand = cleanValue(
    findValue(source, [
      "brand",
      "brandName",
      "brand_name",
      "manufacturer",
      "manufacturerName",
      "manufacturer_name",
    ]) ||
      findValue(firstProduct, [
        "brand",
        "brandName",
        "brand_name",
        "manufacturer",
        "manufacturerName",
        "manufacturer_name",
      ])
  );

  const modelNumber = cleanValue(
    findValue(source, [
      "modelNumber",
      "model_number",
      "model",
      "modelName",
      "model_name",
    ]) ||
      findValue(firstProduct, [
        "modelNumber",
        "model_number",
        "model",
        "modelName",
        "model_name",
      ])
  );

  const serialNumber = cleanValue(
    findValue(source, [
      "serialNumber",
      "serial_number",
      "serial",
      "serialNo",
      "serial_no",
      "serialNumbers",
      "serial_numbers",
    ]) ||
      findValue(firstProduct, [
        "serialNumber",
        "serial_number",
        "serial",
        "serialNo",
        "serial_no",
        "serialNumbers",
        "serial_numbers",
      ])
  );

  const invoiceNumber = cleanValue(
    findValue(source, [
      "invoiceNumber",
      "invoice_number",
      "invoiceNo",
      "invoice_no",
      "invoice",
      "billNumber",
      "bill_number",
      "billNo",
      "bill_no",
      "receiptNumber",
      "receipt_number",
    ])
  );

  const purchaseDate = cleanValue(
    findValue(source, [
      "purchaseDate",
      "purchase_date",
      "dateOfPurchase",
      "date_of_purchase",
      "invoiceDate",
      "invoice_date",
    ])
  );

  const warrantyStartDate = cleanValue(
    findValue(source, [
      "warrantyStartDate",
      "warranty_start_date",
      "warrantyStart",
      "warranty_start",
      "startDate",
      "start_date",
    ])
  );

  const warrantyDuration = cleanValue(
    findValue(source, [
      "warrantyDuration",
      "warranty_duration",
      "duration",
      "warrantyPeriod",
      "warranty_period",
      "period",
    ])
  );

  const warrantyEndDate = cleanValue(
    findValue(source, [
      "warrantyEndDate",
      "warranty_end_date",
      "warrantyEnd",
      "warranty_end",
      "expiryDate",
      "expiry_date",
      "expirationDate",
      "expiration_date",
      "expiresOn",
      "expires_on",
    ])
  );

  const seller = cleanValue(
    findValue(source, [
      "seller",
      "retailer",
      "sellerName",
      "seller_name",
      "retailerName",
      "retailer_name",
      "shopName",
      "shop_name",
      "vendor",
      "vendorName",
      "vendor_name",
    ])
  );

  const warrantyType = cleanValue(
    findValue(source, [
      "warrantyType",
      "warranty_type",
      "type",
      "warrantyProvider",
      "warranty_provider",
    ])
  );

  const category = cleanValue(
    findValue(source, [
      "category",
      "productCategory",
      "product_category",
      "categoryName",
      "category_name",
    ]) ||
      findValue(firstProduct, [
        "category",
        "productCategory",
        "product_category",
        "categoryName",
        "category_name",
      ])
  );

  const placeOfSupply = cleanValue(
    findValue(source, [
      "placeOfSupply",
      "place_of_supply",
      "placeOfPurchase",
      "place_of_purchase",
      "location",
      "address",
      "sellerAddress",
      "seller_address",
    ])
  );

  const contact = cleanValue(
    findValue(source, [
      "contact",
      "sellerContact",
      "seller_contact",
      "contactNumber",
      "contact_number",
      "phone",
      "phoneNumber",
      "phone_number",
      "mobile",
      "mobileNumber",
      "mobile_number",
    ])
  );

  const rawText = cleanValue(
    result?.rawText ||
      result?.ocrText ||
      result?.text ||
      data?.rawText ||
      data?.ocrText ||
      data?.text
  );

  return {
    productName,
    brand,
    modelNumber,
    serialNumber,
    purchaseDate,
    warrantyStartDate,
    warrantyDuration,
    warrantyEndDate,
    seller,
    invoiceNumber,
    warrantyType,
    category,
    placeOfSupply,
    contact,
    products,
    rawText,
  };
}

/*
============================================================
FIND VALUE
============================================================
*/

function findValue(object, keys) {
  if (
    !object ||
    typeof object !== "object"
  ) {
    return "";
  }

  for (const key of keys) {
    const value = object[key];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      const validValues =
        value
          .filter(
            (item) =>
              item !== null &&
              item !== undefined &&
              item !== ""
          )
          .map((item) =>
            typeof item === "object"
              ? JSON.stringify(item)
              : String(item)
          );

      if (validValues.length > 0) {
        return validValues.join(
          " / "
        );
      }

      continue;
    }

    if (
      typeof value !== "object"
    ) {
      return String(value);
    }
  }

  return "";
}

/*
============================================================
FIRST ARRAY
============================================================
*/

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

/*
============================================================
CLEAN VALUE
============================================================
*/

function cleanValue(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value === "object") {
    return "";
  }

  return String(value).trim();
}

/*
============================================================
CATEGORY NORMALIZER
============================================================
*/

function normalizeCategory(value) {
  if (!value) {
    return "";
  }

  const categories = [
    "Electronics",
    "Home & Kitchen",
    "Appliances",
    "Furniture",
    "Jewelry",
    "Vehicle / Car",
    "Bike / Motorcycle",
    "Tools",
    "Mobile & Accessories",
    "Computer & Laptop",
    "TV & Entertainment",
    "Other",
  ];

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  const found =
    categories.find(
      (category) =>
        category.toLowerCase() ===
        normalized
    );

  if (found) {
    return found;
  }

  if (
    normalized.includes(
      "electronic"
    )
  ) {
    return "Electronics";
  }

  if (
    normalized.includes("computer") ||
    normalized.includes("laptop")
  ) {
    return "Computer & Laptop";
  }

  if (
    normalized.includes("mobile") ||
    normalized.includes("phone")
  ) {
    return "Mobile & Accessories";
  }

  if (
    normalized.includes("appliance")
  ) {
    return "Appliances";
  }

  if (
    normalized.includes("furniture")
  ) {
    return "Furniture";
  }

  if (
    normalized.includes("jewelry") ||
    normalized.includes("jewellery")
  ) {
    return "Jewelry";
  }

  if (
    normalized.includes("vehicle") ||
    normalized.includes("car")
  ) {
    return "Vehicle / Car";
  }

  if (
    normalized.includes("bike") ||
    normalized.includes("motorcycle")
  ) {
    return "Bike / Motorcycle";
  }

  if (
    normalized.includes("tool")
  ) {
    return "Tools";
  }

  if (
    normalized.includes("television") ||
    normalized.includes("tv")
  ) {
    return "TV & Entertainment";
  }

  if (
    normalized.includes("home") ||
    normalized.includes("kitchen")
  ) {
    return "Home & Kitchen";
  }

  return "Other";
}

/*
============================================================
INPUT CARD
============================================================
*/

function InputCard({
  label,
  icon,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">

        {icon && (
          <span className="text-teal-700">
            {icon}
          </span>
        )}

        {label}

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}

      </label>

      <div
        className={`rounded-2xl border bg-white px-4 py-3.5 transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100 ${
          required && !value
            ? "border-amber-200"
            : "border-slate-200"
        }`}
      >

        <input
          type="text"
          value={value || ""}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        />

      </div>

      {required && !value && (
        <p className="mt-1.5 px-1 text-[11px] font-medium text-amber-600">
          Required before saving
        </p>
      )}

    </div>
  );
}

/*
============================================================
DATE INPUT
============================================================
*/

function DateInputCard({
  label,
  value,
  onChange,
  required = false,
}) {
  const safeDateValue =
    normalizeDate(value);

  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">

        <CalendarDays
          size={17}
          className="text-teal-700"
        />

        {label}

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}

      </label>

      <div
        className={`rounded-2xl border bg-white px-4 py-3.5 transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100 ${
          required && !safeDateValue
            ? "border-amber-200"
            : "border-slate-200"
        }`}
      >

        <input
          type="date"
          value={safeDateValue}
          onChange={(event) => {
            const selectedDate =
              event.target.value;

            if (
              /^\d{4}-\d{2}-\d{2}$/.test(
                selectedDate
              )
            ) {
              onChange(
                selectedDate
              );
            } else {
              onChange("");
            }
          }}
          className="w-full cursor-pointer bg-transparent text-sm font-semibold text-slate-900 outline-none"
        />

      </div>

      {required && !safeDateValue && (
        <p className="mt-1.5 px-1 text-[11px] font-medium text-amber-600">
          Select a date before saving
        </p>
      )}

    </div>
  );
}

/*
============================================================
CATEGORY
============================================================
*/

function CategoryInput({
  value,
  onChange,
  required = false,
}) {
  const categories = [
    "Electronics",
    "Home & Kitchen",
    "Appliances",
    "Furniture",
    "Jewelry",
    "Vehicle / Car",
    "Bike / Motorcycle",
    "Tools",
    "Mobile & Accessories",
    "Computer & Laptop",
    "TV & Entertainment",
    "Other",
  ];

  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">

        <Tag
          size={17}
          className="text-teal-700"
        />

        Category

        {required && (
          <span className="text-red-500">
            *
          </span>
        )}

      </label>

      <div className="relative">

        <select
          value={value || ""}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={`w-full appearance-none rounded-2xl border bg-white px-4 py-4 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${
            required && !value
              ? "border-amber-200"
              : "border-slate-200"
          }`}
        >

          <option value="">
            Select category
          </option>

          {categories.map(
            (category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            )
          )}

        </select>

        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
        />

      </div>

      {required && !value && (
        <p className="mt-1.5 px-1 text-[11px] font-medium text-amber-600">
          Select a category before saving
        </p>
      )}

    </div>
  );
}

/*
============================================================
REQUIRED STATUS
============================================================
*/

function RequiredStatus({
  label,
  complete,
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
        complete
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >

      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          complete
            ? "bg-emerald-600 text-white"
            : "bg-amber-200 text-amber-700"
        }`}
      >

        {complete ? (
          <Check size={14} />
        ) : (
          <span className="text-xs font-bold">
            !
          </span>
        )}

      </div>

      <span
        className={`text-xs font-semibold ${
          complete
            ? "text-emerald-700"
            : "text-amber-700"
        }`}
      >
        {label}
      </span>

    </div>
  );
}

/*
============================================================
WARRANTY TRACKER
============================================================
*/

function WarrantyTracker({
  status,
  daysLeft,
  endDate,
}) {
  const formattedDate =
    formatReadableDate(endDate);

  if (status === "expired") {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertCircle size={22} />
          </div>

          <div>

            <p className="font-bold text-red-800">
              Warranty expired
            </p>

            <p className="mt-1 text-sm text-red-600">
              Expired {daysLeft}{" "}
              {daysLeft === 1
                ? "day"
                : "days"}{" "}
              ago
            </p>

          </div>

        </div>

        <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3">

          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
            Expired on
          </p>

          <p className="mt-1 text-sm font-bold text-red-800">
            {formattedDate}
          </p>

        </div>

      </div>
    );
  }

  const isUrgent =
    status === "urgent";

  const isSoon =
    status === "soon";

  return (
    <div
      className={`rounded-3xl border p-5 ${
        isUrgent
          ? "border-orange-200 bg-orange-50"
          : isSoon
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >

      <div className="flex items-center gap-3">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            isUrgent
              ? "bg-orange-100 text-orange-600"
              : isSoon
              ? "bg-amber-100 text-amber-600"
              : "bg-emerald-100 text-emerald-600"
          }`}
        >
          <ShieldCheck size={22} />
        </div>

        <div>

          <p
            className={`text-xl font-extrabold ${
              isUrgent
                ? "text-orange-700"
                : isSoon
                ? "text-amber-700"
                : "text-emerald-700"
            }`}
          >
            {daysLeft}{" "}
            {daysLeft === 1
              ? "day"
              : "days"}{" "}
            left
          </p>

          <p className="mt-1 text-sm font-medium text-slate-600">
            Expires {formattedDate}
          </p>

        </div>

      </div>

    </div>
  );
}

/*
============================================================
PRODUCT CARD
============================================================
*/

function ProductCard({
  product,
  index,
}) {
  const serialValue =
    product?.serialNumber ||
    (
      Array.isArray(
        product?.serialNumbers
      )
        ? product.serialNumbers.join(
            " / "
          )
        : product?.serial ||
          product?.serialNo ||
          ""
    );

  const hasBrand =
    Boolean(
      product?.brand ||
        product?.brandName
    );

  const hasModel =
    Boolean(
      product?.modelNumber ||
        product?.model
    );

  const hasSerial =
    Boolean(serialValue);

  const productName =
    product?.productName ||
    product?.product_name ||
    product?.name ||
    product?.itemName ||
    product?.item_name ||
    "Product detected";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-bold text-teal-700 shadow-sm">
          {String(index + 1).padStart(
            2,
            "0"
          )}
        </div>

        <div className="min-w-0 flex-1">

          <p className="text-sm font-bold leading-5 text-slate-900">
            {productName}
          </p>

        </div>

      </div>

      {(hasBrand ||
        hasModel ||
        hasSerial) && (
        <div className="mt-4 space-y-2">

          {hasBrand && (
            <ProductInfo
              label="Brand"
              value={
                product.brand ||
                product.brandName
              }
              icon={
                <Tag size={14} />
              }
            />
          )}

          {hasModel && (
            <ProductInfo
              label="Model"
              value={
                product.modelNumber ||
                product.model
              }
              icon={
                <Package size={14} />
              }
            />
          )}

          {hasSerial && (
            <ProductInfo
              label="Serial Number"
              value={serialValue}
              icon={
                <ShieldCheck size={14} />
              }
            />
          )}

        </div>
      )}

    </div>
  );
}

/*
============================================================
PRODUCT INFO
============================================================
*/

function ProductInfo({
  label,
  value,
  icon,
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5">

      <span className="mt-0.5 shrink-0 text-teal-700">
        {icon}
      </span>

      <div className="min-w-0">

        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-xs font-semibold leading-5 text-slate-700">
          {value}
        </p>

      </div>

    </div>
  );
}

/*
============================================================
DATE NORMALIZER
============================================================
IMPORTANT:
HTML <input type="date"> ONLY accepts:
YYYY-MM-DD
============================================================
*/

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  let text = String(value)
    .trim()
    .replace(/,/g, "")
    .replace(/\s+/g, " ");

  /*
  ------------------------------------------------------------
  Remove time from ISO date
  Example:
  2024-10-19T00:00:00.000Z
  ------------------------------------------------------------
  */

  const isoDateMatch =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (isoDateMatch) {
    return validDateString(
      isoDateMatch[1],
      isoDateMatch[2],
      isoDateMatch[3]
    );
  }

  /*
  ------------------------------------------------------------
  YYYY/MM/DD
  YYYY.MM.DD
  ------------------------------------------------------------
  */

  let match = text.match(
    /^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/
  );

  if (match) {
    return validDateString(
      match[1],
      match[2].padStart(2, "0"),
      match[3].padStart(2, "0")
    );
  }

  /*
  ------------------------------------------------------------
  DD/MM/YYYY
  DD-MM-YYYY
  DD.MM.YYYY
  ------------------------------------------------------------
  */

  match = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/
  );

  if (match) {
    return validDateString(
      match[3],
      match[2].padStart(2, "0"),
      match[1].padStart(2, "0")
    );
  }

  /*
  ------------------------------------------------------------
  DD Month YYYY
  ------------------------------------------------------------
  */

  match = text.match(
    /^(\d{1,2})\s+(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+(\d{2,4})$/i
  );

  if (match) {
    const months = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    const month =
      months[
        match[2].toLowerCase()
      ];

    if (month) {
      let year =
        String(match[3]);

      if (year.length === 2) {
        year =
          Number(year) >= 50
            ? `19${year}`
            : `20${year}`;
      }

      return validDateString(
        year,
        month,
        match[1].padStart(2, "0")
      );
    }
  }

  /*
  ------------------------------------------------------------
  Month DD YYYY
  Example:
  Oct 19 2024
  ------------------------------------------------------------
  */

  match = text.match(
    /^(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+(\d{1,2})\s+(\d{2,4})$/i
  );

  if (match) {
    const months = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    const month =
      months[
        match[1].toLowerCase()
      ];

    if (month) {
      let year =
        String(match[3]);

      if (year.length === 2) {
        year =
          Number(year) >= 50
            ? `19${year}`
            : `20${year}`;
      }

      return validDateString(
        year,
        month,
        match[2].padStart(2, "0")
      );
    }
  }

  /*
  ------------------------------------------------------------
  DD-MM-YY
  DD/MM/YY
  ------------------------------------------------------------
  */

  match = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/
  );

  if (match) {
    const year =
      Number(match[3]) >= 50
        ? `19${match[3]}`
        : `20${match[3]}`;

    return validDateString(
      year,
      match[2].padStart(2, "0"),
      match[1].padStart(2, "0")
    );
  }

  /*
  ------------------------------------------------------------
  JavaScript fallback
  ------------------------------------------------------------
  */

  const parsed =
    new Date(text);

  if (
    !Number.isNaN(
      parsed.getTime()
    )
  ) {
    return formatDateForInput(
      parsed
    );
  }

  return "";
}

/*
============================================================
VALID DATE
============================================================
*/

function validDateString(
  year,
  month,
  day
) {
  const numericYear =
    Number(year);

  const numericMonth =
    Number(month);

  const numericDay =
    Number(day);

  if (
    !Number.isInteger(
      numericYear
    ) ||
    !Number.isInteger(
      numericMonth
    ) ||
    !Number.isInteger(
      numericDay
    )
  ) {
    return "";
  }

  if (
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > 31
  ) {
    return "";
  }

  const date = new Date(
    numericYear,
    numericMonth - 1,
    numericDay
  );

  if (
    date.getFullYear() !==
      numericYear ||
    date.getMonth() !==
      numericMonth - 1 ||
    date.getDate() !==
      numericDay
  ) {
    return "";
  }

  return `${String(
    numericYear
  ).padStart(4, "0")}-${String(
    numericMonth
  ).padStart(2, "0")}-${String(
    numericDay
  ).padStart(2, "0")}`;
}

/*
============================================================
PARSE LOCAL DATE
============================================================
*/

function parseLocalDate(value) {
  if (!value) {
    return null;
  }

  const normalized =
    normalizeDate(value);

  if (!normalized) {
    return null;
  }

  const match =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !==
      month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/*
============================================================
FORMAT DATE FOR INPUT
============================================================
*/

function formatDateForInput(date) {
  if (
    !date ||
    Number.isNaN(date.getTime())
  ) {
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
============================================================
READABLE DATE
============================================================
*/

function formatReadableDate(value) {
  const normalized =
    normalizeDate(value);

  const date =
    parseLocalDate(normalized);

  if (!date) {
    return value || "";
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

export default ConfirmWarranty;
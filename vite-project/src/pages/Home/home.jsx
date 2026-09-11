import { useEffect, useRef, useState } from "react";
import FilePreview from "../../components/ui/FileFreview.jsx";
import AnalyzingScreen from "../../components/ui/AnlyzingScreen.jsx";
import ConfirmWarranty from "../../components/warrenty/ConfirmWarranty.jsx";
import AuthPrompt from "../Auth/AuthPrompt.jsx";
import useAuthPrompt from "../../hooks/useAuthPrompt.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { Bell, Camera, FileText, ScanLine, ShieldCheck, Sparkles, Upload, X, Plus, ChevronRight, AlertCircle, Clock3 } from "lucide-react";
import { saveWarrantyDocument } from "../../untils/warrantyDocumentStore.js";

const API_URL = "http://localhost:5000/api";
const NOTIFICATION_STORAGE_KEY = "warranty_vault_notifications";

function Home() {
  const { token, user } = useAuth();
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfirmWarranty, setShowConfirmWarranty] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const {
    isAuthPromptOpen,
    authPromptMessage,
    requireAuth,
    closeAuthPrompt,
  } = useAuthPrompt();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "[]"
      );

      setNotifications(
        Array.isArray(stored) ? stored.slice(0, 30) : []
      );
    } catch {
      setNotifications([]);
    }
  };

  const addNotification = (notification) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "[]"
      );

      const list = [
        notification,
        ...(Array.isArray(existing) ? existing : []),
      ]
        .filter(
          (item, index, array) =>
            array.findIndex(
              (entry) => entry.id === item.id
            ) === index
        )
        .slice(0, 30);

      localStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(list)
      );

      setNotifications(list);
    } catch {
      setNotifications([]);
    }
  };

  const markNotificationsAsRead = () => {
    const updated = notifications.map((item) => ({
      ...item,
      read: true,
    }));

    setNotifications(updated);

    localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(updated)
    );
  };

  const unreadCount = notifications.filter(
    (item) => !item.read
  ).length;

  const resetScan = () => {
    setShowUploadSheet(false);
    setSelectedFile(null);
    setIsAnalyzing(false);
    setShowConfirmWarranty(false);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }

    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validImage = file.type.startsWith("image/");
    const validPdf = file.type === "application/pdf";

    if (!validImage && !validPdf) {
      alert("Please select an image or PDF file.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setShowUploadSheet(false);
    setIsAnalyzing(false);
    setShowConfirmWarranty(false);

    event.target.value = "";
  };

  const openUploadSheet = () => {
    if (
      !requireAuth(
        "Sign in to scan, upload and save your warranty documents."
      )
    ) {
      return;
    }

    setShowUploadSheet(true);
  };

  const handleWarrantySave = async (warrantyData) => {
    if (!token) {
      alert("Please sign in before saving your warranty.");
      return;
    }

    if (
      !warrantyData?.warrantyStartDate ||
      !warrantyData?.warrantyEndDate
    ) {
      alert(
        "Please enter the warranty start date and warranty end date."
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        productName:
          warrantyData.productName ||
          warrantyData.name ||
          "Unnamed Product",

        brand: warrantyData.brand || "",

        model:
          warrantyData.modelNumber ||
          warrantyData.model ||
          "",

        purchaseDate:
          warrantyData.purchaseDate || null,

        warrantyStartDate:
          warrantyData.warrantyStartDate,

        warrantyDuration:
          warrantyData.warrantyDuration ||
          warrantyData.duration ||
          "",

        warrantyEndDate:
          warrantyData.warrantyEndDate,

        invoiceNumber:
          warrantyData.invoiceNumber || "",

        serialNumber:
          warrantyData.serialNumber || "",

        serialNumbers:
          Array.isArray(
            warrantyData.serialNumbers
          )
            ? warrantyData.serialNumbers
            : [],

        seller:
          warrantyData.seller || "",

        contact:
          warrantyData.contact || "",

        placeOfSupply:
          warrantyData.placeOfSupply || "",

        warrantyType:
          warrantyData.warrantyType ||
          "Warranty",

        category:
          warrantyData.category ||
          "Other",

        purchasePrice:
          warrantyData.purchasePrice !== undefined &&
          warrantyData.purchasePrice !== null &&
          warrantyData.purchasePrice !== ""
            ? Number(warrantyData.purchasePrice)
            : null,

        documentUrl:
          warrantyData.documentUrl || "",

        productImageUrl:
          warrantyData.productImageUrl || "",

        products:
          Array.isArray(warrantyData.products)
            ? warrantyData.products
            : [],
      };

      const response = await fetch(
        `${API_URL}/warranty`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            "Unable to save warranty."
        );
      }

      const serverId = String(
        result?.warranty?._id || ""
      );

      /*
       * Store the large original document
       * in IndexedDB instead of localStorage.
       */
      if (serverId && selectedFile) {
        try {
          await saveWarrantyDocument(
            serverId,
            selectedFile
          );
        } catch (documentError) {
          console.error(
            "Local document storage failed:",
            documentError
          );
        }
      }

      const productName =
        payload.productName;

      addNotification({
        id:
          `saved-${serverId || Date.now()}`,

        type: "info",

        title: "Warranty saved",

        message:
          `${productName} is now protected in your Warranty Vault.`,

        time:
          new Date().toISOString(),

        read: false,
      });

      window.dispatchEvent(
        new Event("warrantyVaultUpdated")
      );

      resetScan();

      alert(
        "Warranty saved successfully!"
      );
    } catch (error) {
      console.error(
        "Unable to save warranty:",
        error
      );

      alert(
        error?.message ||
          "Unable to save this warranty. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationOpen = () => {
    const next = !showNotifications;

    setShowNotifications(next);

    if (next) {
      markNotificationsAsRead();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="mx-auto min-h-screen w-full max-w-5xl overflow-hidden">

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/90 px-5 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-200">
                <ShieldCheck
                  size={23}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Warranty Vault
                </h1>

                <p className="text-xs text-slate-500">
                  Protect what you own
                </p>
              </div>

            </div>

            <div className="relative">

              <button
                type="button"
                onClick={handleNotificationOpen}
                aria-label="Notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
              >
                <Bell size={20} />

                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-violet-600 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() =>
                    setShowNotifications(false)
                  }
                />
              )}

            </div>

          </div>
        </header>

        <main className="px-5 sm:px-7 lg:px-10">

          <section className="pt-8 sm:pt-10 lg:pt-14">
            <p className="text-sm font-semibold text-violet-600">
              Good to see you
              {user?.name
                ? `, ${user.name.split(" ")[0]}`
                : ""}
            </p>
          </section>

          <section className="pt-8 sm:pt-10">

            <button
              type="button"
              onClick={openUploadSheet}
              className="group relative w-full overflow-hidden rounded-[30px] bg-slate-950 p-6 text-left shadow-xl transition hover:-translate-y-0.5 sm:p-8 lg:p-10"
            >

              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />

              <div className="relative z-10">

                <div className="flex items-start justify-between">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500">
                    <ScanLine
                      size={27}
                      className="text-white"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                    <Sparkles size={13} />
                    Smart Scan
                  </div>

                </div>

                <h3 className="mt-8 text-2xl font-bold text-white sm:text-3xl">
                  Scan a Warranty
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Take a photo or upload an image or PDF.
                  Your document will be prepared for review.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
                    Photo
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
                    Image
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80">
                    PDF
                  </span>

                </div>

                <div className="mt-7 flex items-center justify-between">

                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    Scan Warranty
                    <ScanLine size={17} />
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950">
                    <Upload size={18} />
                  </div>

                </div>

              </div>

            </button>

          </section>

          <section className="pt-6">

            <button
              type="button"
              onClick={openUploadSheet}
              className="flex w-full items-center justify-between rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-sm"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Plus size={21} />
                </div>

                <div>

                  <p className="text-sm font-bold text-slate-900">
                    Add another warranty
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Upload a receipt, invoice or warranty
                  </p>

                </div>

              </div>

              <ChevronRight
                size={19}
                className="text-slate-400"
              />

            </button>

          </section>

          <section className="pt-10">

            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
              Simple process
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-900">
              How it works
            </h3>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

              <ProcessCard
                icon={
                  <Camera
                    size={21}
                    className="text-violet-600"
                  />
                }
                title="Upload"
                description="Add your document"
                number="01"
              />

              <ProcessCard
                icon={
                  <Sparkles
                    size={21}
                    className="text-violet-600"
                  />
                }
                title="Analyze"
                description="Read key details"
                number="02"
              />

              <ProcessCard
                icon={
                  <ShieldCheck
                    size={21}
                    className="text-violet-600"
                  />
                }
                title="Protect"
                description="Save warranty"
                number="03"
              />

            </div>

          </section>

          <section className="pt-8">

            <div className="rounded-3xl bg-violet-100 p-5 sm:p-6">

              <div className="flex items-center gap-2">
                <Sparkles
                  size={18}
                  className="text-violet-700"
                />

                <p className="text-sm font-bold text-violet-900">
                  Keep everything protected
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-violet-800/70 sm:text-sm">
                Premium will unlock more storage, backup
                and advanced protection.
              </p>

            </div>

          </section>

        </main>

        <button
          type="button"
          onClick={openUploadSheet}
          aria-label="Add warranty"
          className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl shadow-violet-300 sm:bottom-8 sm:right-8"
        >
          <Plus size={27} />
        </button>

        {showUploadSheet && (
          <UploadSheet
            onClose={() =>
              setShowUploadSheet(false)
            }
            cameraRef={cameraInputRef}
            imageRef={imageInputRef}
            pdfRef={pdfInputRef}
            requireAuth={requireAuth}
          />
        )}

        {selectedFile && (
          <FilePreview
            file={selectedFile}
            onRemove={resetScan}
            onContinue={() => {
              setShowUploadSheet(false);
              setIsAnalyzing(true);
            }}
          />
        )}

        {isAnalyzing && selectedFile && (
          <AnalyzingScreen
            file={selectedFile}
            onComplete={() => {
              setIsAnalyzing(false);
              setShowConfirmWarranty(true);
            }}
          />
        )}

        {showConfirmWarranty && selectedFile && (
          <ConfirmWarranty
            file={selectedFile}
            onBack={() => {
              setShowConfirmWarranty(false);
              setIsAnalyzing(false);
            }}
            onSave={handleWarrantySave}
          />
        )}

        <AuthPrompt
          isOpen={isAuthPromptOpen}
          onClose={closeAuthPrompt}
          message={authPromptMessage}
        />

        {isSaving && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">

            <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-2xl">

              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />

              <p className="mt-3 text-sm font-semibold text-slate-800">
                Saving your warranty...
              </p>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

function UploadSheet({
  onClose,
  cameraRef,
  imageRef,
  pdfRef,
  requireAuth,
}) {
  const choose = (ref) => {
    if (
      !requireAuth(
        "Sign in to use Smart Scan and upload your warranty document."
      )
    ) {
      return;
    }

    ref.current?.click();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-slate-950/40 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div
        className="w-full rounded-t-[32px] bg-white p-5 pb-8 shadow-2xl sm:max-w-lg sm:rounded-[32px] sm:p-7"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >

        <div className="flex items-start justify-between">

          <div>

            <p className="text-xl font-bold text-slate-900">
              Add a warranty
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Choose how you want to add your document.
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"
          >
            <X size={20} />
          </button>

        </div>

        <div className="mt-6 space-y-3">

          <UploadOption
            icon={<Camera size={22} />}
            title="Take Photo"
            description="Capture a receipt or warranty document"
            onClick={() => choose(cameraRef)}
          />

          <UploadOption
            icon={<Upload size={22} />}
            title="Upload Image"
            description="Select an image from your device"
            onClick={() => choose(imageRef)}
          />

          <UploadOption
            icon={<FileText size={22} />}
            title="Upload PDF"
            description="Add your invoice or warranty PDF"
            onClick={() => choose(pdfRef)}
          />

        </div>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">

          <ShieldCheck
            size={16}
            className="text-violet-600"
          />

          <p className="text-xs font-medium text-slate-500">
            Your document will be scanned securely.
          </p>

        </div>

      </div>

    </div>
  );
}

function UploadOption({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-violet-200 hover:bg-violet-50"
    >

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

      </div>

      <ChevronRight
        size={18}
        className="ml-auto text-slate-400"
      />

    </button>
  );
}

function ProcessCard({
  icon,
  title,
  description,
  number,
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between">
        {icon}

        <span className="text-[10px] font-bold tracking-wider text-slate-300">
          {number}
        </span>
      </div>

      <p className="mt-4 text-xs font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-slate-500">
        {description}
      </p>

    </div>
  );
}

function NotificationPanel({
  notifications,
  onClose,
}) {
  return (
    <div
      className="absolute right-0 top-14 z-[200] w-[calc(100vw-40px)] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      onClick={(event) =>
        event.stopPropagation()
      }
    >

      <div className="flex items-center justify-between border-b border-slate-100 p-4">

        <div>

          <p className="text-sm font-bold text-slate-900">
            Notifications
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            Warranty updates and reminders
          </p>

        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100"
        >
          <X size={16} />
        </button>

      </div>

      <div className="max-h-[65vh] overflow-y-auto">

        {notifications.length === 0 ? (
          <div className="p-8 text-center">

            <Bell
              size={21}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 text-sm font-bold text-slate-900">
              No notifications
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Warranty reminders will appear here.
            </p>

          </div>
        ) : (
          <div className="divide-y divide-slate-100">

            {notifications.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
              />
            ))}

          </div>
        )}

      </div>

    </div>
  );
}

function NotificationItem({
  notification,
}) {
  const type =
    notification?.type || "info";

  const urgent =
    type === "urgent";

  const expired =
    type === "expired";

  const warning =
    type === "warning";

  return (
    <div className="flex gap-3 p-4">

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          expired
            ? "bg-red-100 text-red-600"
            : urgent
            ? "bg-orange-100 text-orange-600"
            : warning
            ? "bg-amber-100 text-amber-600"
            : "bg-violet-100 text-violet-600"
        }`}
      >

        {expired || urgent ? (
          <AlertCircle size={17} />
        ) : warning ? (
          <Clock3 size={17} />
        ) : (
          <Bell size={17} />
        )}

      </div>

      <div className="min-w-0 flex-1">

        <p className="text-sm font-bold text-slate-900">
          {notification.title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {notification.message}
        </p>

        <p className="mt-2 text-[10px] text-slate-400">
          {notification.time
            ? new Date(
                notification.time
              ).toLocaleString("en-IN")
            : ""}
        </p>

      </div>

    </div>
  );
}

export default Home;
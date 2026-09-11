import {
  FileDown,
  Home,
  Package,
  User,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import AuthPrompt from "../../pages/Auth/AuthPrompt.jsx";
import useAuthPrompt from "../../hooks/useAuthPrompt.jsx";

// ==========================================
// NAVIGATION ITEMS
// ==========================================

const navItems = [
  {
    name: "Home",
    path: "/",
    icon: Home,
  },
  {
    name: "Products",
    path: "/products",
    icon: Package,
  },
  {
    name: "Documents",
    path: "/protection",
    icon: FileDown,
  },
  {
    name: "Profile",
    path: "/profile",
    icon: User,
  },
];

// ==========================================
// BOTTOM NAVIGATION
// ==========================================

function BottomNavigation() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    isAuthPromptOpen,
    authPromptMessage,
    requireAuth,
    closeAuthPrompt,
  } = useAuthPrompt();

  // ==========================================
  // NAVIGATION
  // ==========================================

  const handleNavigation = (
    path,
    name
  ) => {
    const allowed =
      requireAuth(
        `Sign in to access your ${name} section.`
      );

    if (!allowed) {
      return;
    }

    // Avoid unnecessary navigation
    // when already on the same route.
    if (
      location.pathname === path
    ) {
      return;
    }

    navigate(path);
  };

  return (
    <>
      {/* ======================================
          BOTTOM NAVIGATION
      ======================================= */}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center px-3 pb-3">
        <nav className="pointer-events-auto w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map(
              (item) => {
                const Icon =
                  item.icon;

                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(
                        item.path
                      );

                return (
                  <button
                    key={
                      item.path
                    }
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        item.path,
                        item.name
                      )
                    }
                    className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 transition-all duration-300 ${
                      isActive
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      size={21}
                      strokeWidth={2.2}
                      className="transition-transform duration-300 group-active:scale-90"
                    />

                    <span className="text-[10px] font-semibold">
                      {item.name}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </nav>
      </div>

      {/* ======================================
          AUTHENTICATION PROMPT
      ======================================= */}

      <AuthPrompt
        isOpen={
          isAuthPromptOpen
        }
        onClose={
          closeAuthPrompt
        }
        message={
          authPromptMessage
        }
      />
    </>
  );
}

export default BottomNavigation;
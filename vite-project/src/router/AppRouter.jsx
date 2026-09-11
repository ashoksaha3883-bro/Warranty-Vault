import { Routes, Route } from "react-router-dom";

// ==========================================
// AUTH PAGES
// ==========================================

import GuestEntry from "../pages/Auth/GuestEntry.jsx";
import Login from "../pages/login/Login.jsx";
import Register from "../pages/Auth/register.jsx";
import AuthLanding from "../pages/Auth/AuthLanding.jsx";

// ==========================================
// MAIN PAGES
// ==========================================

import Products from "../pages/Products/product.jsx";
import Premium from "../pages/Premium/premium.jsx";
import Profile from "../pages/Profile/profile.jsx";
import Protection from "../pages/Protection/protection.jsx";

// ==========================================
// PRODUCT DETAILS
// ==========================================

import WarrantyDetails from "../pages/Products/warrantyDetails.jsx";

// ==========================================
// LAYOUT
// ==========================================

import BottomNavigation from "../components/layout/BottomNavigation.jsx";

// ==========================================
// APP LAYOUT
// ==========================================

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {children}

      <BottomNavigation />
    </div>
  );
}

// ==========================================
// APP ROUTER
// ==========================================

function AppRouter() {
  return (
    <Routes>
      {/* =====================================
          ENTRY / WELCOME
      ====================================== */}

      <Route
        path="/"
        element={<GuestEntry />}
      />

      {/* =====================================
          AUTHENTICATION
          NO BOTTOM NAVIGATION
      ====================================== */}

      <Route
        path="/welcome"
        element={<AuthLanding />}
      />

      <Route
        path="/auth"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* =====================================
          MAIN APP
          BOTTOM NAVIGATION ENABLED
      ====================================== */}

      <Route
        path="/products"
        element={
          <AppLayout>
            <Products />
          </AppLayout>
        }
      />

      <Route
        path="/protection"
        element={
          <AppLayout>
            <Protection />
          </AppLayout>
        }
      />

      <Route
        path="/profile"
        element={
          <AppLayout>
            <Profile />
          </AppLayout>
        }
      />

      <Route
        path="/products/:id"
        element={<WarrantyDetails />}
      />
    </Routes>
  );
}

export default AppRouter;
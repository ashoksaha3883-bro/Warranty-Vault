import {
  useCallback,
  useState,
} from "react";

import {
  useAuth,
} from "../context/AuthContext.jsx";

function useAuthPrompt() {
  const { user } =
    useAuth();

  const [
    isAuthPromptOpen,
    setIsAuthPromptOpen,
  ] = useState(false);

  const [
    authPromptMessage,
    setAuthPromptMessage,
  ] = useState("");

  // ==========================================
  // REQUIRE AUTHENTICATION
  // ==========================================

  const requireAuth =
    useCallback(
      (message) => {
        if (user) {
          return true;
        }

        setAuthPromptMessage(
          message ||
            "Create an account or sign in to continue."
        );

        setIsAuthPromptOpen(
          true
        );

        return false;
      },
      [user]
    );

  // ==========================================
  // CLOSE AUTH PROMPT
  // ==========================================

  const closeAuthPrompt =
    useCallback(() => {
      setIsAuthPromptOpen(
        false
      );

      setAuthPromptMessage(
        ""
      );
    }, []);

  return {
    user,
    isAuthPromptOpen,
    authPromptMessage,
    requireAuth,
    closeAuthPrompt,
  };
}

export default useAuthPrompt;
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AuthContext =
  createContext(null);

const API_URL =
  "http://localhost:5000/api";

const TOKEN_KEY =
  "warranty_token";

// ==========================================
// AUTH PROVIDER
// ==========================================

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState(() =>
      localStorage.getItem(
        TOKEN_KEY
      )
    );

  const [loading, setLoading] =
    useState(true);

  const authenticationChecked =
    useRef(false);

  // ==========================================
  // GET CURRENT USER
  // ==========================================

  const getCurrentUser =
    useCallback(
      async (authToken) => {
        if (!authToken) {
          throw new Error(
            "Authentication token is missing"
          );
        }

        try {
          const response =
            await fetch(
              `${API_URL}/auth/me`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${authToken}`,
                },
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Unable to get user"
            );
          }

          setUser(
            data.user
          );

          return data.user;
        } catch (error) {
          console.error(
            "Get current user error:",
            error
          );

          localStorage.removeItem(
            TOKEN_KEY
          );

          setToken(null);
          setUser(null);

          throw error;
        }
      },
      []
    );

  // ==========================================
  // CHECK LOGIN WHEN APP STARTS
  // ==========================================

  useEffect(() => {
    if (
      authenticationChecked.current
    ) {
      return;
    }

    authenticationChecked.current =
      true;

    const checkAuthentication =
      async () => {
        const savedToken =
          localStorage.getItem(
            TOKEN_KEY
          );

        // No login token
        if (!savedToken) {
          setLoading(false);
          return;
        }

        try {
          await getCurrentUser(
            savedToken
          );
        } catch (error) {
          console.error(
            "Authentication check failed:",
            error
          );
        } finally {
          setLoading(false);
        }
      };

    checkAuthentication();
  }, [
    getCurrentUser,
  ]);

  // ==========================================
  // SAVE LOGIN
  // ==========================================

  const saveAuthentication =
    useCallback(
      (data) => {
        if (
          !data?.token ||
          !data?.user
        ) {
          throw new Error(
            "Invalid authentication response"
          );
        }

        localStorage.setItem(
          TOKEN_KEY,
          data.token
        );

        setToken(
          data.token
        );

        setUser(
          data.user
        );
      },
      []
    );

  // ==========================================
  // REGISTER
  // ==========================================

  const register =
    useCallback(
      async (
        name,
        email,
        password
      ) => {
        try {
          const response =
            await fetch(
              `${API_URL}/auth/register`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    name,
                    email,
                    password,
                  }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Unable to create account"
            );
          }

          // Registration does NOT
          // automatically log in.

          return data;
        } catch (error) {
          console.error(
            "Registration error:",
            error
          );

          if (
            error instanceof
              TypeError &&
            error.message
              .toLowerCase()
              .includes("fetch")
          ) {
            throw new Error(
              "Unable to connect to the server. Please make sure the backend is running."
            );
          }

          throw error;
        }
      },
      []
    );

  // ==========================================
  // LOGIN
  // ==========================================

  const login =
    useCallback(
      async (
        email,
        password
      ) => {
        try {
          const response =
            await fetch(
              `${API_URL}/auth/login`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    email,
                    password,
                  }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Unable to sign in"
            );
          }

          saveAuthentication(
            data
          );

          return data;
        } catch (error) {
          console.error(
            "Login error:",
            error
          );

          if (
            error instanceof
              TypeError &&
            error.message
              .toLowerCase()
              .includes("fetch")
          ) {
            throw new Error(
              "Unable to connect to the server. Please make sure the backend is running."
            );
          }

          throw error;
        }
      },
      [
        saveAuthentication,
      ]
    );

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout =
    useCallback(() => {
      localStorage.removeItem(
        TOKEN_KEY
      );

      setToken(null);
      setUser(null);
    }, []);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const contextValue =
    useMemo(
      () => ({
        user,
        token,
        loading,

        register,
        login,
        logout,

        getCurrentUser,
      }),
      [
        user,
        token,
        loading,
        register,
        login,
        logout,
        getCurrentUser,
      ]
    );

  // ==========================================
  // PROVIDER
  // ==========================================

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// USE AUTH
// ==========================================

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};
import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Login failed" }));
        // Extract clean error message
        let errorMessage = errorData.message || "Login failed";
        if (res.status === 401) {
          errorMessage = "Invalid username or password";
        }
        throw new Error(errorMessage);
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      // Set the new user FIRST so the AuthProvider's useQuery observer
      // sees fresh data without an undefined gap, then wipe everything
      // else to prevent seeing the previous user's cached lists.
      //
      // Earlier code used queryClient.clear() before setQueryData; that
      // detached the user query's observer chain, so downstream
      // components (sidebar nav) rendered with user=undefined for one
      // paint and the nav role-branch fell through to the default.
      // Bug surfaced as "Founding doesn't appear until I click Settings"
      // — the Settings button was a hard window.location reload that
      // masked the orphaned-observer state.
      queryClient.setQueryData(["/api/user"], user);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/user",
      });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in to CreviaTube.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your username and password.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Registration failed" }));
        // Extract clean error message
        let errorMessage = errorData.message || "Registration failed";
        if (errorMessage.includes("Username already exists")) {
          errorMessage = "This username is already taken. Please choose a different one.";
        } else if (errorMessage.includes("Email already exists")) {
          errorMessage = "An account with this email already exists. Please use a different email.";
        } else if (res.status === 400) {
          errorMessage = errorMessage; // Keep backend message for other validation errors
        } else {
          errorMessage = "Registration failed. Please try again.";
        }
        throw new Error(errorMessage);
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      // Set user first so the auth observer stays attached, then wipe
      // every other query to ensure a clean state on a fresh account.
      // See the matching comment on the login mutation for the bug
      // history.
      queryClient.setQueryData(["/api/user"], user);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/user",
      });

      toast({
        title: "Account created successfully!",
        description: "Welcome to CreviaTube. You can now start creating campaigns.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear all cached data when logging out to prevent data leakage
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
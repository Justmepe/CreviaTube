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
      // Clear all cached data when logging in to prevent seeing other users' data
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in to CreoCash.",
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
    mutationFn: async (credentials: InsertUser & { enterpriseRequestData?: any }) => {
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
      // Clear all cached data when registering to ensure clean state
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      
      // Show different welcome messages based on user type
      if (user.userType === "enterprise") {
        toast({
          title: "Enterprise Account Created!",
          description: "Please complete your enterprise request to activate your white-label platform.",
          variant: "default",
        });
      } else {
        toast({
          title: "Account created successfully!",
          description: "Welcome to CreoCash. You can now start creating campaigns.",
          variant: "default",
        });
      }
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
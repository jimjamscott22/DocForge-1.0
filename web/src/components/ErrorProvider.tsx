"use client";

import React, { createContext, useContext, useCallback, ReactNode } from "react";
import { AppError, ErrorCode, ErrorSeverity, isAppError } from "@/lib/errors";
import { useToast } from "./ToastProvider";

interface ErrorContextType {
  handleError: (error: unknown, context?: string) => void;
  handleAuthError: (message: string) => void;
  handleNetworkError: (message: string, error?: Error) => void;
  handleServerError: (message: string, error?: Error) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const { showError } = useToast();

  const logError = useCallback((error: unknown, context?: string) => {
    const contextPrefix = context ? `[${context}] ` : "";
    
    if (isAppError(error)) {
      console.error(`${contextPrefix}${error.code}:`, error.message, error.details);
      if (error.originalError) {
        console.error("Original error:", error.originalError);
      }
    } else if (error instanceof Error) {
      console.error(`${contextPrefix}${error.name}:`, error.message);
    } else {
      console.error(`${contextPrefix}Unknown error:`, error);
    }
  }, []);

  const getUserMessage = useCallback((error: unknown): string => {
    if (isAppError(error)) {
      return error.userMessage;
    }
    
    if (error instanceof Error) {
      return error.message || "An unexpected error occurred";
    }
    
    return "An unexpected error occurred";
  }, []);

  const handleError = useCallback((error: unknown, context?: string) => {
    logError(error, context);
    showError(getUserMessage(error));
  }, [logError, showError, getUserMessage]);

  const handleAuthError = useCallback((message: string) => {
    const error = new AppError({
      code: ErrorCode.AUTH_REQUIRED,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
    });
    handleError(error, "Auth");
  }, [handleError]);

  const handleNetworkError = useCallback((message: string, error?: Error) => {
    const appError = new AppError({
      code: ErrorCode.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      userMessage: message,
      originalError: error,
    });
    handleError(appError, "Network");
  }, [handleError]);

  const handleServerError = useCallback((message: string, error?: Error) => {
    const appError = new AppError({
      code: ErrorCode.SERVER_ERROR,
      severity: ErrorSeverity.HIGH,
      userMessage: message,
      originalError: error,
    });
    handleError(appError, "Server");
  }, [handleError]);

  return (
    <ErrorContext.Provider
      value={{
        handleError,
        handleAuthError,
        handleNetworkError,
        handleServerError,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export const useErrorHandler = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorHandler must be used within ErrorProvider");
  }
  return context;
};

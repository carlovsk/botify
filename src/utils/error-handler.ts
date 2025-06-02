/**
 * Centralized error handling utilities for the application
 */

import { startLogger } from '@/utils/logger';

export interface ErrorContext {
  userId?: string;
  operation?: string;
  additionalData?: Record<string, any>;
}

/**
 * Standard error types for better error categorization
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL = 'INTERNAL',
}

/**
 * Application-specific error class with enhanced context
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    context: ErrorContext = {},
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.context = context;
    this.isOperational = isOperational;

    // Maintain proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler utility for consistent error processing
 */
export class ErrorHandler {
  private static logger = startLogger('ErrorHandler');

  /**
   * Get user-friendly error message based on error type
   */
  static getUserFriendlyMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.AUTHENTICATION:
        return 'Please reconnect your Spotify account to continue.';
      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorType.VALIDATION:
        return `Invalid input: ${error.message}`;
      case ErrorType.NOT_FOUND:
        return `Requested resource not found: ${error.message}`;
      case ErrorType.EXTERNAL_SERVICE:
        return 'Spotify service is temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Handle and log errors consistently
   */
  static handleError(error: unknown, context: ErrorContext = {}): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      // Convert standard errors to AppError
      appError = this.convertToAppError(error, context);
    } else {
      // Handle non-Error objects
      appError = new AppError(String(error), ErrorType.INTERNAL, context);
    }

    // Log the error
    this.logger.error('Error occurred', {
      error: {
        message: appError.message,
        type: appError.type,
        stack: appError.stack,
        context: appError.context,
        isOperational: appError.isOperational,
      },
    });

    return appError;
  }

  /**
   * Convert standard errors to AppError based on error patterns
   */
  private static convertToAppError(error: Error, context: ErrorContext): AppError {
    const message = error.message.toLowerCase();

    // Spotify-specific error patterns
    if (message.includes('authorization') || message.includes('unauthorized')) {
      return new AppError(error.message, ErrorType.AUTHENTICATION, context);
    }

    if (message.includes('forbidden') || message.includes('access denied')) {
      return new AppError(error.message, ErrorType.AUTHORIZATION, context);
    }

    if (message.includes('not found') || message.includes('does not exist')) {
      return new AppError(error.message, ErrorType.NOT_FOUND, context);
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new AppError(error.message, ErrorType.VALIDATION, context);
    }

    // Network/external service errors
    if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
      return new AppError(error.message, ErrorType.EXTERNAL_SERVICE, context);
    }

    // Default to internal error
    return new AppError(error.message, ErrorType.INTERNAL, context);
  }

  /**
   * Create Spotify-specific errors
   */
  static createSpotifyError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(message, ErrorType.EXTERNAL_SERVICE, context);
  }

  static createAuthError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, context);
  }

  static createValidationError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(message, ErrorType.VALIDATION, context);
  }

  static createNotFoundError(message: string, context: ErrorContext = {}): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, context);
  }
}

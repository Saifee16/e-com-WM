interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

interface ApiErrorLike {
  response?: {
    data?: ApiErrorBody;
  };
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiErrorLike;
  const responseError = apiError.response?.data?.error;

  if (responseError?.code === 'VALIDATION_ERROR' && Array.isArray(responseError.details)) {
    const issue = responseError.details.find((detail): detail is { path?: unknown[]; message: string } => (
      typeof detail === 'object'
      && detail !== null
      && 'message' in detail
      && typeof detail.message === 'string'
    ));

    if (issue) {
      const field = Array.isArray(issue.path)
        ? issue.path
          .filter((segment): segment is string | number => typeof segment === 'string' || typeof segment === 'number')
          .map((segment) => String(segment).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())
          .join(' → ')
        : '';
      return field ? `${field}: ${issue.message}` : issue.message;
    }
  }

  return responseError?.message ?? apiError.response?.data?.message ?? (error instanceof Error ? error.message : fallback);
};

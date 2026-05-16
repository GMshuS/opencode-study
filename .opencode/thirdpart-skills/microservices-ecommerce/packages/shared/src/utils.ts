export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatResponse = <T>(data: T, message?: string) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

export const formatErrorResponse = (error: string, statusCode: number = 500) => {
  return {
    success: false,
    error,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, '').trim();
};

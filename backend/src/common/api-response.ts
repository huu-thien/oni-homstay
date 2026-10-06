export function successResponse<T>(data: T, message = 'OK') {
  return {
    success: true,
    data,
    message,
  };
}

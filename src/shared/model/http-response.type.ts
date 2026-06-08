export interface HttpSuccessResponse<T> {
  data: T;
}

export interface HttpSuccessResponsePagination<T> {
  data: T;
  pagination: Pagination;
}

export interface HttpErrorResponse {
  error: HttpError;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface HttpError {
  code: string;
  details?: Detail[] | string;
  message: string;
}

interface Detail {
  path: string;
  message: string;
}

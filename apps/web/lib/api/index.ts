export * from "./bans";
export * from "./configs";
export * from "./events";
export * from "./ip-infos";
export * from "./matches";
export * from "./notifiers";
export * from "./stats";
export * from "./watchers";

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

export type ApiError = {
  error: string;
  message: string | string[];
  statusCode: number;
};

export type ApiResult<OutputType> = {
  data: OutputType;
  totalCount: number;
};

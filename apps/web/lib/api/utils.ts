import { EitherAsync, Left, Right } from "purify-ts";
import { ApiError, ApiResult, HttpMethod } from ".";

const API_BASE_URL_SERVER = process.env.BANALIZE_WEB_API_SERVER_URL;

if (!API_BASE_URL_SERVER) {
  throw new Error("BANALIZE_WEB_API_SERVER_URL is not defined");
}

type QueryParams =
  | {
      [key: string]: string | number | string[] | undefined;
    }
  | object;

export const fetchFromApi = <OutputType, InputType = void>(
  method: HttpMethod,
  endpoint: string,
  data?: InputType,
): EitherAsync<ApiError, ApiResult<OutputType>> => {
  return EitherAsync<ApiError, ApiResult<OutputType>>(
    async ({ fromPromise }) => {
      const isServer = typeof window === "undefined";
      let url = `${isServer ? API_BASE_URL_SERVER : "/api"}${endpoint}`;

      if (method === "GET" && data) {
        const queryString = createQueryString(data);
        url += `?${queryString}`;
      }

      console.log("API request to", url);

      const body = method !== "GET" ? JSON.stringify(data) : undefined;

      return await fromPromise(
        fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          cache: "no-cache",
          body,
        })
          .then(async (res) => {
            if (!res.ok) {
              const error = await res.json();
              return Left({
                error: "Fetch error",
                message: error.message,
                statusCode: res.status,
              });
            }

            return Right({
              data: (await res.json()) as OutputType,
              totalCount: Number(res.headers.get("x-total-count")) || 0,
            });
          })
          .catch((error) => {
            console.error("Fetch error:", error);
            return Left({
              error: "Fetch error",
              message: error.message ?? "An error occurred while fetching data",
              statusCode: error.status ?? 500,
            });
          }),
      );
    },
  );
};

const createQueryString = (params: QueryParams): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params)
    .filter(([_, value]) => value != null && value !== "")
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Append each array item as the same key
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        // Append the single value
        searchParams.append(key, String(value));
      }
    });

  return searchParams.toString();
};

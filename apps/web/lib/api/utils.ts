const API_BASE_URL_SERVER = process.env.BANALIZE_WEB_API_SERVER_URL;

if (!API_BASE_URL_SERVER) {
  throw new Error("BANALIZE_WEB_API_SERVER_URL is not defined");
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

type QueryParams =
  | {
      [key: string]: string | number | string[] | undefined;
    }
  | object;

export const fetchFromApi = async <OutputType, InputType = void>(
  method: HttpMethod,
  endpoint: string,
  data?: InputType,
) => {
  // Use the server API URL when running on the server,
  // otherwise use the client API URL
  const isServer = typeof window === "undefined";
  let url = `${isServer ? API_BASE_URL_SERVER : "/api"}${endpoint}`;

  // If the method is GET, append the data as query parameters
  if (method === "GET" && data) {
    const queryString = createQueryString(data);
    url += `?${queryString}`;
  }

  console.log("API request to", url);

  // If the method is not GET, add the data as the request body
  const body = method !== "GET" ? JSON.stringify(data) : undefined;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      cache: "no-cache",
      body,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return {
      data: (await res.json()) as OutputType,
      totalCount: Number(res.headers.get("x-total-count")) || 0,
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return { data: undefined as OutputType, totalCount: 0 };
  }
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

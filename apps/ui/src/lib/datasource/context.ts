import { createContext, useContext } from "react";
import type { DataSource } from "./types";

export const DataSourceContext = createContext<DataSource | null>(null);

/** Access the injected data source. Throws if used outside the provider. */
export function useDataSource(): DataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error("useDataSource must be used within a DataSourceProvider");
  }
  return ds;
}

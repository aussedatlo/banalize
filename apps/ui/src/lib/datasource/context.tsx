import { createContext, useContext, type ReactNode } from "react";
import type { DataSource } from "./types";

const DataSourceContext = createContext<DataSource | null>(null);

export function DataSourceProvider({
  value,
  children,
}: {
  value: DataSource;
  children: ReactNode;
}) {
  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
}

/** Access the injected data source. Throws if used outside the provider. */
export function useDataSource(): DataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error("useDataSource must be used within a DataSourceProvider");
  }
  return ds;
}

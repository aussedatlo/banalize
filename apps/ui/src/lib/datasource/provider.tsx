import type { ReactNode } from "react";
import { DataSourceContext } from "./context";
import type { DataSource } from "./types";

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

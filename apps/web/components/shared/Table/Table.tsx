"use client";

import { Box, Table as MantineTable } from "@mantine/core";
import classes from "./Table.module.css";

type CustomTableProps<T, K extends string> = {
  items: T[];
  headers: Record<K, string>;
  renderRow: (item: T, key: K) => React.ReactNode;
  onRowClick?: (item: T) => void;
};

export const Table = <T extends object, K extends string>({
  items,
  headers,
  renderRow,
  onRowClick,
}: CustomTableProps<T, K>) => {
  const headerValues: string[] = Object.values(headers);
  const headerKeys: K[] = Object.keys(headers) as K[]; // Safely cast to K[]

  const rows = items.map((item, index) => (
    <MantineTable.Tr
      key={index}
      className={classes.row}
      onClick={() => onRowClick && onRowClick(item)}
      style={{ cursor: onRowClick ? "pointer" : "default" }}
    >
      {headerKeys?.map((key: K) => (
        <MantineTable.Td key={String(key)}>
          {renderRow(item, key)}
        </MantineTable.Td>
      ))}
    </MantineTable.Tr>
  ));

  return (
    <Box p="xs" className={classes.container}>
      <MantineTable
        layout="fixed"
        className={classes.table}
        w={{ base: "auto", md: "100%" }}
      >
        <MantineTable.Thead className={classes.header}>
          <MantineTable.Tr>
            {headerValues?.map((value) => (
              <MantineTable.Th key={value}>{value}</MantineTable.Th>
            ))}
          </MantineTable.Tr>
        </MantineTable.Thead>
        <MantineTable.Tbody>{rows}</MantineTable.Tbody>
      </MantineTable>
    </Box>
  );
};

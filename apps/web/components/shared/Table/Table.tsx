"use client";

import { Box, Center, Table as MantineTable, Pagination } from "@mantine/core";
import { useMemo, useState } from "react";
import classes from "./Table.module.css";

const MAX_ITEMS = 10;

type CustomTableProps<T> = {
  items: T[];
  headers: Record<string, string>;
  renderRow: (item: T, key: string) => React.ReactNode;
  onRowClick?: (item: T) => void;
};

export const Table = <T extends object>({
  items,
  headers,
  renderRow,
  onRowClick,
}: CustomTableProps<T>) => {
  const [activePage, setPage] = useState(1);
  const headerValues = Object.values(headers);
  const headerKeys = Object.keys(headers);

  const slicedItems = useMemo(
    () => items.slice((activePage - 1) * MAX_ITEMS, activePage * MAX_ITEMS),
    [items, activePage],
  );

  const rows = slicedItems.map((item, index) => (
    <MantineTable.Tr
      key={index}
      className={classes.row}
      onClick={() => onRowClick && onRowClick(item)}
      style={{ cursor: onRowClick ? "pointer" : "default" }}
    >
      {headerKeys?.map((key) => (
        <MantineTable.Td key={key}>{renderRow(item, key)}</MantineTable.Td>
      ))}
    </MantineTable.Tr>
  ));

  return (
    <>
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

      <Center>
        <Pagination
          mt="lg"
          total={Math.ceil(items.length / MAX_ITEMS)}
          value={activePage}
          onChange={setPage}
          c="grey"
          color="cyan"
        />
      </Center>
    </>
  );
};

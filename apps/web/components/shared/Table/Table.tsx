"use client";

import { Box, Center, Table as MantineTable, Pagination } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import classes from "./Table.module.css";

const MAX_ITEMS = 10;

type ItemType = string | number | React.ReactElement | React.ReactNode;

type CustomTableProps<T extends Record<string, ItemType>> = {
  items: T[];
  headers: Record<string, string>;
  filter: string;
  onRowClick?: (item: T) => void;
};

export const Table = <T extends Record<string, ItemType>>({
  items,
  headers,
  filter,
  onRowClick,
}: CustomTableProps<T>) => {
  const [activePage, setPage] = useState(1);
  const headerValues = Object.values(headers);
  const headerKeys = Object.keys(headers);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const filteredItems = useMemo(() => {
    const searchLower = filter.toLowerCase();
    return items.filter((item) =>
      headerKeys.some(
        (key) =>
          item &&
          item[key] &&
          JSON.stringify(item[key]).toLowerCase().includes(searchLower),
      ),
    );
  }, [items, headerKeys, filter]);

  const slicedItems = useMemo(
    () =>
      filteredItems.slice((activePage - 1) * MAX_ITEMS, activePage * MAX_ITEMS),
    [filteredItems, activePage],
  );

  const rows = slicedItems.map((item, index) => (
    <MantineTable.Tr
      key={index}
      className={classes.row}
      onClick={() => onRowClick && onRowClick(item)}
      style={{ cursor: onRowClick ? "pointer" : "default" }}
    >
      {headerKeys?.map((key) => (
        <MantineTable.Td key={key}>{item[key]}</MantineTable.Td>
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
          total={Math.ceil(filteredItems.length / MAX_ITEMS)}
          value={activePage}
          onChange={setPage}
          c="grey"
          color="cyan"
        />
      </Center>
    </>
  );
};

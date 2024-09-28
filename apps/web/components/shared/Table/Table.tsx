"use client";

import { Box, Center, Table as MantineTable, Pagination } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import classes from "./Table.module.css";

const MAX_ITEMS = 10;

type ItemType = string | number | React.ReactElement | React.ReactNode;

type CustomTableProps<T extends Record<string, ItemType>> = {
  items: T[];
  headers: string[];
  filter: string;
  widths: number[];
};

export const Table = <T extends Record<string, ItemType>>({
  items,
  headers,
  filter,
  widths,
}: CustomTableProps<T>) => {
  const [activePage, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const filteredItems = useMemo(() => {
    const searchLower = filter.toLowerCase();
    return items.filter((item) =>
      headers.some(
        (key) =>
          item &&
          item[key] &&
          JSON.stringify(item[key]).toLowerCase().includes(searchLower),
      ),
    );
  }, [items, headers, filter]);

  const slicedItems = useMemo(
    () =>
      filteredItems.slice((activePage - 1) * MAX_ITEMS, activePage * MAX_ITEMS),
    [filteredItems, activePage],
  );

  const rows = slicedItems.map((item, index) => (
    <MantineTable.Tr key={index} className={classes.row}>
      {headers?.map((key) => (
        <MantineTable.Td key={key}>{item[key]}</MantineTable.Td>
      ))}
    </MantineTable.Tr>
  ));

  return (
    <Box w="100%" p="xs">
      <MantineTable layout="fixed">
        <MantineTable.Thead className={classes.header}>
          <MantineTable.Tr>
            {headers?.map((value, index) => (
              <MantineTable.Th
                key={value}
                style={{ width: `${widths[index]}%` }}
              >
                {value}
              </MantineTable.Th>
            ))}
          </MantineTable.Tr>
        </MantineTable.Thead>
        <MantineTable.Tbody>{rows}</MantineTable.Tbody>
      </MantineTable>

      <Center>
        <Pagination
          mt="lg"
          total={filteredItems.length / MAX_ITEMS}
          value={activePage}
          onChange={setPage}
          c="grey"
          color="yellow"
        />
      </Center>
    </Box>
  );
};

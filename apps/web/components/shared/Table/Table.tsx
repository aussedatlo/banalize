"use client";

import {
  Box,
  Table as MantineTable,
  rem,
  ScrollArea,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import cx from "clsx";
import { useState } from "react";
import classes from "./Table.module.css";

type CustomTableProps<T extends Record<string, string | number>> = {
  items: T[];
  headers: string[];
};

export const Table = <T extends Record<string, string | number>>({
  items,
  headers,
}: CustomTableProps<T>) => {
  const [search, setSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);
  const [scrolled, setScrolled] = useState(false);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setFilteredItems(
      items.filter((item) =>
        Object.values(item).some((field) =>
          field.toString().toLowerCase().includes(value.toLowerCase()),
        ),
      ),
    );
  };

  const rows = filteredItems.map((item, index) => (
    <MantineTable.Tr key={index}>
      {headers?.map((key) => (
        <MantineTable.Td key={key}>{item[key]}</MantineTable.Td>
      ))}
    </MantineTable.Tr>
  ));

  return (
    <Box w="100%">
      <TextInput
        placeholder="Search by any field"
        mb="md"
        leftSection={
          <IconSearch
            style={{ width: rem(16), height: rem(16) }}
            stroke={1.5}
          />
        }
        value={search}
        onChange={handleSearchChange}
      />
      <ScrollArea
        h={300}
        onScrollPositionChange={({ y }) => setScrolled(y !== 0)}
      >
        <MantineTable>
          <MantineTable.Thead
            className={cx(classes.header, { [classes.scrolled]: scrolled })}
          >
            <MantineTable.Tr>
              {headers?.map((value) => (
                <MantineTable.Th key={value}>{value}</MantineTable.Th>
              ))}
            </MantineTable.Tr>
          </MantineTable.Thead>
          <MantineTable.Tbody className={classes.row}>
            {rows}
          </MantineTable.Tbody>
        </MantineTable>
      </ScrollArea>
    </Box>
  );
};

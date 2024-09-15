import { rem, ScrollArea, Table, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import cx from "clsx";
import { useState } from "react";
import classes from "./CustomTable.module.css";

type CustomTableProps<T extends Record<string, string | number>> = {
  items: T[];
  headers: string[];
};

export const CustomTable = <T extends Record<string, string | number>>({
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
    <Table.Tr key={index}>
      {headers?.map((key) => <Table.Td key={key}>{item[key]}</Table.Td>)}
    </Table.Tr>
  ));

  return (
    <>
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
        <Table miw={700}>
          <Table.Thead
            className={cx(classes.header, { [classes.scrolled]: scrolled })}
          >
            <Table.Tr>
              {headers?.map((value) => (
                <Table.Th key={value}>{value}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </>
  );
};

"use client";

import { WatcherType } from "@banalize/types";
import {
  ActionIcon,
  Button,
  Group,
  rem,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBrandDocker,
  IconFile,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { DropdownInput } from "components/shared/Input/DropdownInput";
import { TextInput } from "components/shared/Input/TextInput";
import { useState } from "react";

export type ConfigFormType = {
  _id?: string;
  name: string;
  param: string;
  regex: string;
  banTime: number;
  findTime: number;
  maxMatches: number;
  watcherType: WatcherType;
  ignoreIps: string;
  paused: boolean;
};

type ConfigFormProps = {
  onSumbit: (config: ConfigFormType) => Promise<void>;
  initialConfig?: ConfigFormType;
};

export const ConfigForm = ({ onSumbit, initialConfig }: ConfigFormProps) => {
  const theme = useMantineTheme();
  const [ignoreIps, setIgnoreIps] = useState<string>(
    initialConfig?.ignoreIps ?? "",
  );

  const form = useForm<ConfigFormType>({
    mode: "controlled",
    initialValues: {
      param: "",
      name: "",
      regex: "",
      banTime: 3600,
      findTime: 3600,
      maxMatches: 3,
      ...initialConfig,
      watcherType: initialConfig?.watcherType ?? WatcherType.FILE,
      ignoreIps: initialConfig?.ignoreIps ?? "",
      paused: initialConfig?.paused ?? false,
    },
  });

  const onSubmitRequested = async (values: ConfigFormType) => {
    const config = {
      ...values,
      ignoreIps,
      banTime: Number(values.banTime),
      findTime: Number(values.findTime),
      maxMatches: Number(values.maxMatches),
    };
    await onSumbit(config);
  };

  const addIgnoreIp = () => {
    setIgnoreIps((prev) => `${prev},`);
  };

  const removeIgnoreIp = (index: number) => {
    setIgnoreIps((prev) => {
      const updated = prev.split(",");
      updated.splice(index, 1);
      return updated.join(",");
    });
  };

  const updateIgnoreIp = (index: number, value: string) => {
    // should include only dot and numbers
    if (!value.match(/^[0-9./]+$/)) {
      return;
    }

    setIgnoreIps((prev) => {
      const updated = prev.split(",");
      updated[index] = value;
      return updated.join(",");
    });
  };

  return (
    <form onSubmit={form.onSubmit(onSubmitRequested)}>
      {initialConfig?._id ? (
        <TextInput
          mt="md"
          label="Id"
          value={initialConfig._id}
          disabled
          type="string"
          key={form.key("_id")}
          {...form.getInputProps("_id")}
        />
      ) : null}

      <TextInput
        mt="md"
        label="Name"
        placeholder="Name"
        type="string"
        key={form.key("name")}
        {...form.getInputProps("name")}
      />

      <TextInput
        mt="md"
        label="Parameter"
        placeholder="/path/to/the/file.log"
        type="string"
        key={form.key("param")}
        {...form.getInputProps("param")}
      />

      <TextInput
        mt="md"
        label="Regex"
        placeholder="^test.*<IP>.*300$"
        type="string"
        key={form.key("regex")}
        {...form.getInputProps("regex")}
      />

      <TextInput
        mt="md"
        label="Ban time"
        placeholder="3600"
        type="number"
        key={form.key("banTime")}
        {...form.getInputProps("banTime")}
      />

      <TextInput
        mt="md"
        label="Find time"
        placeholder="3600"
        type="number"
        key={form.key("findTime")}
        {...form.getInputProps("findTime")}
      />

      <TextInput
        mt="md"
        label="Max matches"
        placeholder="3"
        type="number"
        key={form.key("maxMatches")}
        {...form.getInputProps("maxMatches")}
      />

      <Text fz="sm" mt="md">
        Watcher type
      </Text>
      <DropdownInput
        w="100%"
        data={[
          {
            label: "File",
            icon: (
              <IconFile
                style={{ width: rem(16), height: rem(16) }}
                color={theme.colors.pink[8]}
              />
            ),
            value: WatcherType.FILE,
          },
          {
            label: "Docker",
            icon: (
              <IconBrandDocker
                style={{ width: rem(16), height: rem(16) }}
                color={theme.colors.cyan[8]}
              />
            ),
            value: WatcherType.DOCKER,
          },
        ]}
        onValueChange={(value) => form.setFieldValue("watcherType", value)}
        initialValue={initialConfig?.watcherType ?? WatcherType.FILE}
        key={form.key("watcherType")}
      />

      <Text fz="sm" mt="md">
        Ignore IPs
      </Text>
      {ignoreIps.split(",").map((value, index) => (
        <Group key={index} align="center" mb="xs" gap="xs">
          <TextInput
            value={value}
            onChange={(e) => updateIgnoreIp(index, e.currentTarget.value)}
            placeholder={`Ignore IP ${index + 1}`}
            style={{ flex: 1 }}
          />
          <ActionIcon
            onClick={() => removeIgnoreIp(index)}
            variant="filled"
            size="lg"
            color="pink"
            disabled={ignoreIps.length === 0}
          >
            <IconTrash style={{ width: rem(18), height: rem(18) }} />
          </ActionIcon>
          {index === ignoreIps.split(",").length - 1 ? (
            <ActionIcon
              onClick={addIgnoreIp}
              variant="filled"
              size="lg"
              color="cyan"
            >
              <IconPlus style={{ width: rem(18), height: rem(18) }} />
            </ActionIcon>
          ) : null}
        </Group>
      ))}

      <Group justify="flex-end" mt="md">
        <Button type="submit" color="cyan" w="100%">
          {initialConfig?._id ? "Update" : "Create"}
        </Button>
      </Group>
    </form>
  );
};

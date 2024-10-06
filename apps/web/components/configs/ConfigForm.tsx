"use client";

import { WatcherType, type ConfigSchema } from "@banalize/types";
import { Button, Group, Notification, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBrandDocker, IconFile } from "@tabler/icons-react";
import { TextInput } from "components/shared/Input/TextInput";
import { MenuIcon } from "components/shared/Menu/MenuIcon";
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
  onDone: () => void;
  onSumbit: (
    config: ConfigFormType,
  ) => Promise<ConfigSchema | { message: string }>;
  initialConfig?: ConfigFormType;
};

export const ConfigForm = ({
  onSumbit,
  onDone,
  initialConfig,
}: ConfigFormProps) => {
  const [message, setMessage] = useState<string | undefined>(undefined);
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
      _id: values._id,
      name: values.name,
      param: values.param,
      regex: values.regex,
      banTime: Number(values.banTime),
      findTime: Number(values.findTime),
      maxMatches: Number(values.maxMatches),
      watcherType: values.watcherType,
      ignoreIps: values.ignoreIps,
      paused: values.paused,
    };

    const result = await onSumbit(config);

    if ("message" in result) {
      setMessage(result.message);
      return;
    }

    onDone();
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
      <MenuIcon
        w="100%"
        data={[
          { label: "File", icon: <IconFile />, value: WatcherType.FILE },
          {
            label: "Docker",
            icon: <IconBrandDocker />,
            value: WatcherType.DOCKER,
          },
        ]}
        onValueChange={(value) => form.setFieldValue("watcherType", value)}
        initialValue={initialConfig?.watcherType ?? WatcherType.FILE}
        key={form.key("watcherType")}
      />

      <TextInput
        mt="md"
        label="Ignore IPs"
        placeholder=""
        type="string"
        key={form.key("ignoreIps")}
        {...form.getInputProps("ignoreIps")}
      />

      {message !== undefined ? (
        <Notification
          mt="md"
          color="red"
          title="Error"
          onClose={() => setMessage(undefined)}
        >
          {JSON.stringify(message)}
        </Notification>
      ) : null}

      <Group justify="flex-end" mt="md">
        <Button type="submit">
          {initialConfig?._id ? "Update" : "Create"}
        </Button>
      </Group>
    </form>
  );
};

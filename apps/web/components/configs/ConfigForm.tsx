"use client";

import { ConfigSchema } from "@banalize/api";
import { Button, Group, Notification, Select, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";

export type ConfigFormType = {
  _id?: string;
  param: string;
  regex: string;
  banTime: number;
  findTime: number;
  maxMatches: number;
  watcherType: string;
  ignoreIps: string;
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
    mode: "uncontrolled",
    initialValues: {
      param: "",
      regex: "",
      banTime: 3600,
      findTime: 3600,
      maxMatches: 3,
      ...initialConfig,
      watcherType: initialConfig?.watcherType === "docker" ? "Docker" : "File",
      ignoreIps: initialConfig?.ignoreIps ?? "",
    },
  });

  const onSubmitRequested = async (values: ConfigFormType) => {
    const config = {
      _id: values._id,
      param: values.param,
      regex: values.regex,
      banTime: Number(values.banTime),
      findTime: Number(values.findTime),
      maxMatches: Number(values.maxMatches),
      watcherType: values.watcherType.toLowerCase(),
      ignoreIps: values.ignoreIps,
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
          key={form.key("_id")}
          {...form.getInputProps("_id")}
        />
      ) : null}
      <TextInput
        mt="md"
        label="Parameter"
        placeholder="/path/to/the/file.log"
        key={form.key("param")}
        {...form.getInputProps("param")}
      />

      <TextInput
        mt="md"
        label="Regex"
        placeholder="^test.*<IP>.*300$"
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

      <Select
        mt="md"
        comboboxProps={{ withinPortal: true }}
        data={["File", "Docker"]}
        placeholder="File or Docker"
        label="Type of watcher"
        key={form.key("watcherType")}
        {...form.getInputProps("watcherType")}
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

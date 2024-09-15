import { Button, Group, Notification, Select, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { createConfig } from "utils/api";

type ConfigFormType = {
  param: string;
  regex: string;
  banTime: number;
  findTime: number;
  maxMatches: number;
  watcherType: string;
};

type ConfigFormProps = {
  onDone: () => void;
};

export const ConfigForm = ({ onDone }: ConfigFormProps) => {
  const [message, setMessage] = useState(undefined);
  const form = useForm<ConfigFormType>({
    mode: "uncontrolled",
    initialValues: {
      param: "",
      regex: "",
      banTime: 3600,
      findTime: 3600,
      maxMatches: 3,
      watcherType: "",
    },
  });

  const onSubmit = async (values: ConfigFormType) => {
    const config = {
      param: values.param,
      regex: values.regex,
      banTime: Number(values.banTime),
      findTime: Number(values.findTime),
      maxMatches: Number(values.maxMatches),
      watcherType: values.watcherType.toLowerCase(),
    };

    const result = await createConfig(config);

    if (!result._id) {
      setMessage(result.message);
      return;
    }

    onDone();
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
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
        <Button type="submit">Submit</Button>
      </Group>
    </form>
  );
};
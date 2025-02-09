import {
  EventType,
  NotifierConfigDto,
  NotifierEmailConfigSchema,
  NotifierSignalConfigSchema,
} from "@banalize/types";
import {
  Button,
  Group,
  Notification,
  rem,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconMessageCircle } from "@tabler/icons-react";
import { EventIcon } from "components/shared/Icon/EventIcon";
import { MultiSelect } from "components/shared/Input/MultiSelect";
import { TextInput } from "components/shared/Input/TextInput";
import { MenuIcon } from "components/shared/Menu/MenuIcon";
import { IconText } from "components/shared/Text/IconText";
import { useEffect, useState } from "react";

enum NotifierType {
  EMAIL = "Email",
  SIGNAL = "Signal",
}

type NotifierConfigFormProps = {
  onSubmit: (dto: NotifierConfigDto) => Promise<object>;
  onCancel: () => void;
  initialValues?: NotifierConfigDto;
  id?: string;
};

type SignalKey = keyof NotifierSignalConfigSchema;
type EmailKey = keyof NotifierEmailConfigSchema;
type Key = SignalKey | EmailKey;

const keyToLabelMap: Record<Key, string> = {
  username: "Username",
  password: "Password",
  server: "Server URL",
  port: "Server Port",
  recipientEmail: "Recipient email",
  number: "Phone number",
  recipients: "Recipients",
};

export const NotifierConfigForm: React.FC<NotifierConfigFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  id,
}) => {
  const [message, setMessage] = useState<string>();
  const [type, setType] = useState<NotifierType>(
    initialValues?.emailConfig
      ? NotifierType.EMAIL
      : initialValues?.signalConfig
        ? NotifierType.SIGNAL
        : NotifierType.EMAIL,
  );
  const form = useForm<NotifierConfigDto>({
    mode: "controlled",
    initialValues: {
      events: ["ban", "unban", "match"],
      ...initialValues,
      signalConfig: initialValues?.signalConfig
        ? initialValues.signalConfig
        : {
            number: "",
            recipients: [],
            server: "",
          },
      emailConfig: initialValues?.emailConfig
        ? initialValues.emailConfig
        : {
            username: "",
            password: "",
            server: "",
            port: 587,
            recipientEmail: "",
          },
    },
  });

  useEffect(() => {
    setMessage(undefined);
  }, []);

  const onSubmitRequested = async (values: NotifierConfigDto) => {
    const dto =
      type === NotifierType.EMAIL && values.emailConfig
        ? {
            events: values.events,
            emailConfig: {
              ...values.emailConfig,
              port: Number(values.emailConfig.port),
            },
          }
        : { events: values.events, signalConfig: values.signalConfig };

    const result = await onSubmit(dto);

    if ("message" in result && typeof result.message === "string") {
      setMessage(result.message);
      return;
    }

    onCancel();
  };

  return (
    <form onSubmit={form.onSubmit(onSubmitRequested)}>
      {id && <TextInput mt="md" label="Id" value={id} disabled type="string" />}

      <MultiSelect
        withPills={true}
        mt="md"
        label="Events"
        data={[
          { label: "Ban", value: EventType.BAN },
          { label: "Unban", value: EventType.UNBAN },
          { label: "Match", value: EventType.MATCH },
        ]}
        renderOption={(item) => (
          <IconText
            text={item.option.value}
            icon={<EventIcon type={item.option.value as EventType} />}
            textProps={{ style: { textTransform: "capitalize" } }}
          />
        )}
        {...form.getInputProps("events")}
      />

      <Text fz="sm" mt="md">
        Notifier type
      </Text>
      <MenuIcon
        w="100%"
        data={[
          {
            label: "Signal",
            icon: (
              <ThemeIcon color="dark" size={rem(25)}>
                <IconMessageCircle
                  style={{ width: rem(16), height: rem(16) }}
                />
              </ThemeIcon>
            ),
            value: NotifierType.SIGNAL,
          },
          {
            label: "Email",
            icon: (
              <ThemeIcon color="dark" size={rem(25)}>
                <IconMail style={{ width: rem(16), height: rem(16) }} />
              </ThemeIcon>
            ),
            value: NotifierType.EMAIL,
          },
        ]}
        onValueChange={(value) => setType(value)}
        initialValue={type}
      />

      {type === NotifierType.EMAIL &&
        form.values.emailConfig &&
        Object.keys(form.values.emailConfig).map((key) => (
          <TextInput
            mt="md"
            label={keyToLabelMap[key as EmailKey]}
            key={form.key(`emailConfig.${key}`)}
            {...form.getInputProps(`emailConfig.${key}`)}
          />
        ))}

      {type === NotifierType.SIGNAL &&
        form.values.signalConfig &&
        Object.keys(form.values.signalConfig).map((key) => (
          <TextInput
            mt="md"
            label={keyToLabelMap[key as SignalKey]}
            key={form.key(`signalConfig.${key}`)}
            {...form.getInputProps(`signalConfig.${key}`)}
          />
        ))}

      {message && (
        <Notification
          mt="md"
          color="pink"
          title="Error"
          onClose={() => setMessage(undefined)}
        >
          {JSON.stringify(message)}
        </Notification>
      )}

      <Group justify="flex-end" mt="md">
        <Button type="submit" color="pink">
          {id ? "Update" : "Create"}
        </Button>
      </Group>
    </form>
  );
};

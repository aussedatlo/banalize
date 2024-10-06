"use client";

import { extractIp } from "@banalize/shared-utils";
import { type ConfigSchema } from "@banalize/types";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Notification,
  rem,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTestPipe } from "@tabler/icons-react";
import { useState } from "react";

type TryRegexConfigButtonProps = {
  config: ConfigSchema;
};

export const TryRegexConfigButton = ({ config }: TryRegexConfigButtonProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [regex, setRegex] = useState(config.regex);
  const [test, setTest] = useState("");
  const [ip, setIp] = useState<null | undefined | string>(undefined);
  const [error, setError] = useState<string | null | undefined>(undefined);

  return (
    <>
      <Tooltip label="Try regex" withArrow>
        <ActionIcon
          onClick={() => open()}
          variant="filled"
          size="lg"
          color="cyan"
        >
          <IconTestPipe style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={opened}
        onClose={() => {
          setIp(undefined);
          setError(undefined);
          close();
        }}
        title="Try Regex"
      >
        <TextInput
          mt="md"
          label="Regex"
          value={regex}
          onChange={(e) => setRegex(e.target.value)}
        />

        <TextInput
          mt="md"
          label="Test String"
          value={test}
          onChange={(e) => setTest(e.target.value)}
        />

        {(ip || error) && (
          <Notification
            mt="md"
            color={error ? "pink" : "cyan"}
            title={error ? "Error" : "IP found"}
            onClose={() => {
              setIp(undefined);
              setError(undefined);
            }}
          >
            {error ? error : ip}
          </Notification>
        )}

        <Group mt="md" justify="end">
          <Button
            color="pink"
            onClick={() => {
              const ip = extractIp(regex, test);
              if (ip) {
                setIp(ip);
                setError(null);
              } else {
                setError("No IP found");
                setIp(null);
              }
            }}
          >
            Test
          </Button>
        </Group>
      </Modal>
    </>
  );
};

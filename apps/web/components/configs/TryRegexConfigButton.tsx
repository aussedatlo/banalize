"use client";

import { extractIp } from "@banalize/shared-utils";
import { type ConfigSchema } from "@banalize/types";
import { Button, Group, Modal, Notification, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconRegex } from "@tabler/icons-react";
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
      <Button
        leftSection={<IconRegex size={18} />}
        onClick={() => {
          open();
        }}
      >
        Try Regex
      </Button>

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
            color={error ? "red" : "green"}
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
            color="blue"
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

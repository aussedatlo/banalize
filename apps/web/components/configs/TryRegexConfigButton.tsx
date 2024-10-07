"use client";

import { type ConfigSchema } from "@banalize/types";
import {
  ActionIcon,
  Card,
  Modal,
  Notification,
  rem,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTestPipe } from "@tabler/icons-react";
import { TextInput } from "components/shared/Input/TextInput";
import { HighlightedText } from "components/shared/Text/HightlightedText";
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

        <Text mt="md">Result of the regex:</Text>
        <Card>
          <HighlightedText
            text={test.length ? test : "No test string provided"}
            regex={regex}
          />
        </Card>

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
      </Modal>
    </>
  );
};

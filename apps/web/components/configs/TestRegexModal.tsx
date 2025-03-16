"use client";

import { Card, Modal, Notification, Text } from "@mantine/core";
import { TextInput } from "components/shared/Input/TextInput";
import { HighlightedText } from "components/shared/Text/HightlightedText";
import { useState } from "react";

type TestRegexModalProps = {
  regex: string;
  opened: boolean;
  onClose: () => void;
};

export const TestRegexModal = ({
  regex: initialRegex,
  opened,
  onClose,
}: TestRegexModalProps) => {
  const [regex, setRegex] = useState(initialRegex);
  const [test, setTest] = useState("");
  const [ip, setIp] = useState<null | undefined | string>(undefined);
  const [error, setError] = useState<string | null | undefined>(undefined);

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setIp(undefined);
        setError(undefined);
        onClose();
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
  );
};

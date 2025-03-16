import { Button, Group, Modal, Text } from "@mantine/core";

export type ConfirmationModalProps = {
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  opened: boolean;
};

export const ConfirmationModal = ({
  onConfirm,
  onCancel,
  title,
  message,
  opened,
}: ConfirmationModalProps) => {
  return (
    <Modal opened={opened} onClose={onCancel} title={title}>
      <Group>
        <Text fz="sm">{message}</Text>
      </Group>
      <Group justify="space-between" mt="lg">
        <Button color="cyan" onClick={onConfirm}>
          Confirm
        </Button>
        <Button color="pink" onClick={onCancel}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
};

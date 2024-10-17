"use client";

import { NotifierConfigDto, NotifierConfigSchema } from "@banalize/types";
import { Badge, Group, Modal, Text, ThemeIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconMail, IconMessageCircle } from "@tabler/icons-react";
import { DeleteSmallButton } from "components/shared/Buttons/DeleteSmallButton";
import { EditSmallButton } from "components/shared/Buttons/EditSmallButton";
import { Paper } from "components/shared/Paper/Paper";
import { useNotifications } from "hooks/useNotifications";
import { useState } from "react";
import { NotifierConfigForm } from "./NotifierConfigForm";

type NotifierConfigPaperProps = {
  config: NotifierConfigSchema;
};

export const NotifierConfigPaper = ({
  config: initialConfig,
}: NotifierConfigPaperProps) => {
  const [config, setConfig] = useState<NotifierConfigSchema>(initialConfig);
  const [opened, { open, close }] = useDisclosure(false);
  const { remove, update } = useNotifications();
  const type = config.emailConfig ? "Email" : "Signal";
  const icon = config.emailConfig ? <IconMail /> : <IconMessageCircle />;

  const onDelete = async () => {
    await remove(config._id);
  };

  const onUpdate = async (dto: NotifierConfigDto) => {
    const updated = await update(config._id, dto);
    setConfig(updated);

    return updated;
  };

  return (
    <>
      <Paper
        title={`${type} Notifier`}
        icon={icon}
        override={
          <Group m="md" justify="space-between">
            <Group>
              <ThemeIcon color="pink">{icon}</ThemeIcon>
              <Text fz="h3">{type} Notifier</Text>
            </Group>
            <Group>
              <EditSmallButton onEdit={() => open()} />
              <DeleteSmallButton onDelete={onDelete} />
            </Group>
          </Group>
        }
      >
        <Group>
          {config.events.map((event) => (
            <Badge key={event} color="cyan" variant="filled">
              {event}
            </Badge>
          ))}
        </Group>
      </Paper>

      <Modal opened={opened} onClose={close} title="Edit config">
        <NotifierConfigForm
          onCancel={close}
          onSubmit={onUpdate}
          initialValues={config}
          id={config._id}
        />
      </Modal>
    </>
  );
};

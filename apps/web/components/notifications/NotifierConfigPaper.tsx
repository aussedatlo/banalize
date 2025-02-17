"use client";

import { NotifierConfigDto, NotifierConfigSchema } from "@banalize/types";
import { Badge, Group, Modal, rem, Text, ThemeIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconEdit,
  IconMail,
  IconMessageCircle,
  IconTestPipe,
  IconTrash,
} from "@tabler/icons-react";
import { Menu } from "components/shared/Menu/Menu";
import { Paper } from "components/shared/Paper/Paper";
import {
  deleteNotifierConfig,
  sendTestNotification,
  updateNotifierConfig,
} from "lib/api";
import { useRouter } from "next/navigation";
import { NotifierConfigForm } from "./NotifierConfigForm";

type NotifierConfigPaperProps = {
  config: NotifierConfigSchema;
};

export const NotifierConfigPaper = ({ config }: NotifierConfigPaperProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const type = config.emailConfig ? "Email" : "Signal";
  const icon = config.emailConfig ? <IconMail /> : <IconMessageCircle />;

  const onDelete = async () => {
    await deleteNotifierConfig(config._id).ifRight(() => {
      router.refresh();
    });
  };

  const onUpdate = async (dto: NotifierConfigDto) => {
    await updateNotifierConfig(config._id, dto).ifRight(() => {
      close();
      router.refresh();
    });
  };

  const onTestNotification = async () => {
    await sendTestNotification(config._id);
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
              <Menu
                items={[
                  {
                    text: "Edit config",
                    icon: (
                      <IconEdit style={{ width: rem(16), height: rem(16) }} />
                    ),
                    onClick: open,
                  },
                  {
                    text: "Delete config",
                    icon: <IconTrash />,
                    onClick: onDelete,
                  },
                  {
                    text: "Send test notification",
                    icon: (
                      <IconTestPipe
                        style={{ width: rem(16), height: rem(16) }}
                      />
                    ),
                    onClick: onTestNotification,
                  },
                ]}
              />
            </Group>
          </Group>
        }
      >
        <Group>
          <Text>Events:</Text>
          {config.events.map((event) => (
            <Badge key={event} color="cyan" variant="filled">
              {event}
            </Badge>
          ))}
        </Group>
      </Paper>

      <Modal opened={opened} onClose={close} title="Edit config">
        <NotifierConfigForm
          onSubmit={onUpdate}
          initialValues={config}
          id={config._id}
        />
      </Modal>
    </>
  );
};

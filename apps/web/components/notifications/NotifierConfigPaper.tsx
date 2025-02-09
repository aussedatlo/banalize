"use client";

import { NotifierConfigDto, NotifierConfigSchema } from "@banalize/types";
import {
  ActionIcon,
  Badge,
  Group,
  Menu,
  Modal,
  rem,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDotsVertical,
  IconEdit,
  IconMail,
  IconMessageCircle,
  IconTestPipe,
  IconTrash,
} from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import {
  deleteNotifierConfig,
  sendTestNotification,
  updateNotifierConfig,
} from "lib/api";
import { useRouter } from "next/navigation";
import { NotifierConfigForm } from "./NotifierConfigForm";
import styles from "./NotifierConfigPaper.module.css";

type NotifierConfigPaperProps = {
  config: NotifierConfigSchema;
};

export const NotifierConfigPaper = ({ config }: NotifierConfigPaperProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const type = config.emailConfig ? "Email" : "Signal";
  const icon = config.emailConfig ? <IconMail /> : <IconMessageCircle />;

  const onDelete = async () => {
    const result = await deleteNotifierConfig(config._id);

    if (result && result._id) {
      notifications.show({
        title: "Config deleted",
        message: "Notifier config was successfully deleted",
        color: "cyan",
      });
    } else {
      notifications.show({
        title: "Config deletion failed",
        message: "Notifier config was not deleted",
        color: "pink",
      });
    }
    router.refresh();
  };

  const onUpdate = async (dto: NotifierConfigDto) => {
    const updated = await updateNotifierConfig(config._id, dto);
    router.refresh();

    if (updated && updated._id) {
      notifications.show({
        title: "Config updated",
        message: "Notifier config was successfully updated",
        color: "cyan",
      });
    } else {
      notifications.show({
        title: "Config update failed",
        message: "Notifier config was not updated",
        color: "pink",
      });
    }

    return updated;
  };

  const onTestNotification = async () => {
    const result = await sendTestNotification(config._id);

    if (result && result.success === true) {
      notifications.show({
        title: "Test notification sent",
        message: "Test notification was successfully sent",
        color: "cyan",
      });
    } else {
      notifications.show({
        title: "Test notification failed",
        message: result.message ?? "An error occurred",
        color: "pink",
      });
    }
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
              <Menu>
                <Menu.Target>
                  <ActionIcon variant="filled" size="lg" color="cyan">
                    <IconDotsVertical
                      style={{ width: rem(18), height: rem(18) }}
                    />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  {[
                    {
                      text: "Edit config",
                      icon: (
                        <ThemeIcon color="dark" size={rem(22)}>
                          <IconEdit
                            style={{ width: rem(16), height: rem(16) }}
                          />
                        </ThemeIcon>
                      ),
                      onClick: open,
                    },
                    {
                      text: "Delete config",
                      icon: (
                        <ThemeIcon color="dark" size={rem(22)}>
                          <IconTrash
                            style={{ width: rem(16), height: rem(16) }}
                          />
                        </ThemeIcon>
                      ),
                      onClick: onDelete,
                    },
                    {
                      text: "Send test notification",
                      icon: (
                        <ThemeIcon color="dark" size={rem(22)}>
                          <IconTestPipe
                            style={{ width: rem(16), height: rem(16) }}
                          />
                        </ThemeIcon>
                      ),
                      onClick: onTestNotification,
                    },
                  ].map(({ text, icon, onClick }, index) => (
                    <Menu.Item
                      key={index}
                      onClick={onClick}
                      leftSection={icon}
                      className={styles.input}
                    >
                      {text}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
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
          onCancel={close}
          onSubmit={onUpdate}
          initialValues={config}
          id={config._id}
        />
      </Modal>
    </>
  );
};

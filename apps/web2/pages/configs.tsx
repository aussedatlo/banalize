import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import type { GetStaticProps, InferGetStaticPropsType } from "next";

type Config = {
  id: string;
  name: string;
};

export const getStaticProps = (async () => {
  const res = await fetch("http://localhost:3000/configs");
  const configs = await res.json();
  console.log(configs);
  return { props: { configs } };
}) satisfies GetStaticProps<{
  configs: Config[];
}>;

export default function ConfigsPage({
  configs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <div>
      <Button leftSection={<IconPlus size={18} />} onClick={open}>
        New config
      </Button>

      <Modal opened={opened} onClose={close} title="Authentication">
        {/* Modal content */}
      </Modal>
    </div>
  );
}

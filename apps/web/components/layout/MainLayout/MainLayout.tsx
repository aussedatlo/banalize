import { Box, Container } from "@mantine/core";
import { PropsWithChildren } from "react";
import { NavbarSimple } from "../Navbar/NavbarSimple";
import styles from "./MainLayout.module.css";

const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className={styles.root}>
      <NavbarSimple />

      <Box className={styles.container}>
        <Container size="xl" w="100%">
          {children}
        </Container>
      </Box>
    </div>
  );
};
export default MainLayout;

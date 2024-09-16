import { Container } from "@mantine/core";
import { PropsWithChildren } from "react";
import { NavbarSimple } from "../Navbar/NavbarSimple";
import styles from "./MainLayout.module.css";

const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className={styles.root}>
      <NavbarSimple />

      <Container size={"xl"} w={"100%"}>
        {children}
      </Container>
    </div>
  );
};
export default MainLayout;

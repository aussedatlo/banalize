import { Container } from "@mantine/core";
import { PropsWithChildren } from "react";
import { NavbarSimple } from "../Navbar/NavbarSimple";
import styles from "./Layout.module.css";

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className={styles.root}>
      <NavbarSimple />

      <Container size={"lg"} w={"100%"}>
        {children}
      </Container>
    </div>
  );
};
export default Layout;

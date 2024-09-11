import { PropsWithChildren } from "react";
import { NavbarSimple } from "../Navbar/NavbarSimple";
import styles from "./Layout.module.css";

const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className={styles.root}>
      <NavbarSimple />
      {children}
    </div>
  );
};
export default Layout;

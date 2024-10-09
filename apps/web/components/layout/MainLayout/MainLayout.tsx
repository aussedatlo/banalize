import { PropsWithChildren } from "react";
import { NavBar } from "../Navbar/NavBar";
import styles from "./MainLayout.module.css";

const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className={styles.root}>
      <NavBar>{children}</NavBar>
    </div>
  );
};
export default MainLayout;

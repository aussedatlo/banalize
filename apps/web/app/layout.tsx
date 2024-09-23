import "@mantine/charts/styles.css";
import "@mantine/core/styles.css";
import "./global.css";

import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import MainLayout from "components/layout/MainLayout/MainLayout";
import { PropsWithChildren } from "react";
import { theme } from "../theme";

export const metadata = {
  title: "Banalize",
  description: "Banalize web application",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <MainLayout>{children}</MainLayout>
        </MantineProvider>
      </body>
    </html>
  );
}

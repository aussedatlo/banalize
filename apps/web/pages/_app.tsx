import "@mantine/core/styles.css";
import "./global.css";

import { MantineProvider } from "@mantine/core";
import Layout from "components/Layout/Layout";
import type { AppProps } from "next/app";
import Head from "next/head";
import { theme } from "../theme";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Head>
        <title>Banalize</title>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <link rel="shortcut icon" href="/favicon.svg" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </MantineProvider>
  );
}
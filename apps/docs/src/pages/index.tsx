import React from "react";
import clsx from "clsx";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        {/* <img src="/img/skia2.png" alt="Skia" height="200" width="auto" /> */}
        <h1 className="hero__title" style={{ color: "white" }}>
          {siteConfig.title}
        </h1>
        <p className="hero__subtitle" style={{ color: "white" }}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/installation"
          >
            Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

// eslint-disable-next-line import/no-default-export
export default function Home() {
  //const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="React Native Skia"
      description="High Performance 2D Graphics"
    >
      <HomepageHeader />
      <main>
        <div
          className="container"
          style={{
            display: "flex",
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: "2rem",
            marginBottom: "2rem",
          }}
        >
          <iframe
            width="560"
            height="315"
            src="https://www.youtube.com/embed/EHxEX78alZE"
            title="YouTube video player"
            style={{ border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </main>
    </Layout>
  );
}

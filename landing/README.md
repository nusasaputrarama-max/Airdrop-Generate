# AIRDROP GENERATE — Informational Landing Page

This directory contains a standalone, static informational preview.

## Scope

- One HTML file: `index.html`.
- No JavaScript, API routes, server actions, database, analytics, wallet SDK, or external asset dependencies.
- No URL submission or URL fetching.
- No Link Scanner endpoint or scanner invocation.
- No wallet connection, signing, or transaction functionality.
- The page explicitly states that the public scanner/application is not available.

## Local preview

Open `index.html` directly in a browser, or serve this directory with any simple static file server. No build step is required.

## Deployment status

**NOT DEPLOYED. NO PUBLIC URL VERIFIED.**

This source is on the isolated `project-landing` branch. It has not changed GitHub Pages settings, repository deployment workflows, Hatch artifacts, production configuration, or any live application. Do not describe this branch as a published website.

Before publishing, configure a separate static hosting target that serves only this `landing/` directory. Verify the resulting HTTPS URL from an external browser, check the response/health, and confirm that no application backend or scanner is reachable. Hosting approval does not approve the scanner or application release.

## Content maintenance

Keep all feature descriptions and status statements accurate. Do not remove the warning that this is an informational preview until the corresponding public application functionality has independently passed its security and release gates.

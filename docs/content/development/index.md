# Developer Guide

!!! warning "Work-In-Progress"
    This repository is currently a work-in-progress and acts as a living reference. Overtime, this repository will be partially made available via [AWS PDK](https://aws.github.io/aws-pdk) as libraries and constructs become more stable and robust. This repository is expected to remain as an example reference for bootstrapping such a project using the toolkit provided by the [AWS PDK](https://aws.github.io/aws-pdk).

This codebase is polyglot monorepo managed by [AWS PDK Monoreop](https://aws.github.io/aws-pdk/developer_guides/nx-monorepo/index.html) which utilizes the following technologies under the hood:

* [pnpm](https://pnpm.io) - workspace management.
* [projen](https://projen.io/) - define and maintain complex project configuration through code; Project-as-Code (PaC).
* [nx](https://nx.dev/) - polyglot package build and dependency management, plus caching and performance improvements.

## Folder Structure
At a high-level, the project is structured as follows:

```sh
.
├── bin # Project level tooling - such as `galileo-cli`
├── demo # Application code - will become the generated "blueprint" from AWS PDK in the future
│   ├── api # TypeSafe API (schema first development)
│   ├── corpus # Contains code for corpus embedding/indexing/api docker (semantic search ++)
│   ├── infra # CDK infrastructure project (application/cicd/etc)
│   ├── sample-dataset # Sample dataset generator and example deployment constructs
│   └── website # Front-end website (React + Cloudscape)
├── docs # Document site generator (https://www.mkdocs.org/)
├── packages # Framework packages - will eventually be moved to AWS PDK
│   ├── galileo-cdk-lib # Currently not used, but will be home for CDK infra constructs that are reusable
│   └── galileo-sdk # SDK for core reusable toolkit library/tools/etc.
├── scripts # Development scripts for this repository
├── projenrc # Projen constructs that generate everything above
│   ├── components # Common projen components
│   ├── demo # /demo/** project generators
│   └── framework # /packages/** project generators
└── .projenrc.ts # Projen entry point and generator for the monorepo itself
```

### .projenrc.ts

This project uses [Projen](https://github.com/projen/projen) to handle synthesizing projects. In order to add new Projects or change existing settings, please follow the below process:

1. Modify the `.projenrc.ts` file and save it.
   1. Refer to [PDK .projenrc.ts](https://github.com/aws/aws-pdk/blob/mainline/.projenrc.ts) for a working example.
2. From the root, run `pnpm projen`. This will synthesize all of your projects.

## Common Commands

- Run CLI: `pnpm run galileo-cli`
- Synthesize repository: `pnpm projen` - necessary anytime to change projen files (`.projenrc.ts` and `projenrc/*` files)
- Build Everything: `pnpm build`
- Build specific package: `pnpm exec nx run {name}:build` -> `pnpm exec nx run infra:build`
- Clean everything up
  - Generated files, untracked files, node_modules and nx cache: `git clean -xdf`
  - Poetry cache: `rm -rf ~/Library/Caches/pypoetry/virtualenvs`
  - pnpm cache: `pnpm store prune`

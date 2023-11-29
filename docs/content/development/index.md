# Developer Guide

--8<-- "wip.md"
--8<-- "news-feed.md"
--8<-- "aws-genai-llm-chatbot/mention.md"

This codebase is polyglot monorepo managed by [AWS PDK Monoreop](https://aws.github.io/aws-pdk/developer_guides/nx-monorepo/index.html) which utilizes the following technologies under the hood:

* [pnpm](https://pnpm.io) - workspace management.
* [projen](https://projen.io/) - define and maintain complex project configuration through code; Project-as-Code (PaC).
* [nx](https://nx.dev/) - polyglot package build and dependency management, plus caching and performance improvements.

## Folder Structure

At a high-level, the project is structured as follows:

```sh
.
├── bin # Project level tooling - such as `galileo-cli`
├── demo # Application code
│   ├── api # TypeSafe API (schema first development)
│   ├── corpus # Contains code for corpus embedding/indexing/api docker (semantic search ++)
│   ├── infra # CDK infrastructure project (application/cicd/etc)
│   ├── sample-dataset # Sample dataset generator and example deployment constructs
│   └── website # Front-end website (React + Cloudscape)
├── docs # Document site generator (https://www.mkdocs.org/)
├── packages # Supporting packages
│   ├── galileo-cdk # CDK construct library
│   ├── galileo-cli # Command-Line Interface
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

* Run CLI: `pnpm run galileo-cli`
* Synthesize repository: `pnpm projen` - necessary anytime to change projen files (`.projenrc.ts` and `projenrc/*` files)
* Build Everything: `pnpm build`
* Build specific package: `pnpm exec nx run {name}:build` -> `pnpm exec nx run infra:build`
* Clean everything up
  * Generated files, untracked files, node_modules and nx cache: `git clean -xdf`
  * Poetry cache: `rm -rf ~/Library/Caches/pypoetry/virtualenvs`
  * pnpm cache: `pnpm store prune`

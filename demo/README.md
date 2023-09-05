# Galileo Demo

This folder contains all the application code for the galileo demo, and is considered the "blueprint" for what galileo will bootstrap new repositories with in the future.

```sh
.
├── demo # Application code - will become the generated "blueprint" from AWS PDK in the future
│   ├── api # TypeSafe API (schema first development)
│   ├── corpus # Contains code for corpus embedding/indexing/api docker (semantic search ++)
│   ├── docs # Document site generator (https://www.mkdocs.org/)
│   ├── infra # CDK infrastructure project (application/cicd/etc)
│   ├── sample-dataset # Sample dataset generator and example deployment constructs
│   └── website # Front-end website (React + Cloudscape)
```

## How to modify the API?
This application is Schema-First design using the [TypeSafe API](https://aws.github.io/aws-pdk/developer_guides/type-safe-api/index.html) package to auto-generate spec, infra, runtime, docs, etc.
- [Smithy](https://smithy.io/2.0/) is the schema definition language used

Edit the schema by modifying the smithy models located in
- [api/model/src/main/smithy](api/model/src/main/smithy)
- run build afterwards to re-generate everything

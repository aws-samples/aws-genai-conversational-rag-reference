# Galileo Command Line Interface (CLI)

## Overview

This sample comes with a companion CLI that helps you to run repeating tasks:

* [Deployment](./deploy/)
* [User management](./user-management/)
* [Document upload](./document-upload/)
* [Bulk test questions against your deployed system](./bulk-test/)

!!! note "Work-In-Progress"
    The CLI can be run with a helper command `pnpm run galileo-cli`. In the future, this may change and exposed as a standalone command: `galileo-cli`.

## Prerequisites

This tool is primarily for *developers* who have access to their AWS account with the necessary permissions, using **AWS CLI profiles**.

1. [Configure your AWS profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) associated with your AWS account.
2. Make sure that your credentials are available in the terminal session you're running the CLI from.

## Available commands

To check what commands are available for the CLI, you can run:

```sh
pnpm run galileo-cli --help
```

Most of the CLI commands support **flags**, which you can use to parameterize the commands.

To check what flags are supported, you can run `pnpm run galileo-cli <command> --help`.

> Note: The CLI uses [oclif](https://oclif.io/). For further customization, please refer to its documentation.

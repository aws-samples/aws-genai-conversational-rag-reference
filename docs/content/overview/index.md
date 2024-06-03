# Overview

--8<-- "wip.md"

Galileo Generative AI Reference Sample is a reference implementation of a deployable 3-tier retrieval augmented generative (RAG) application that aims to meet the needs of developers as they seek to rapidly experiment with, deploy, and launch GenAI powered products and services that utilise RAG. It is implemented in a number of languages, using AWS Cloud Development Kit ([CDK](https://aws.amazon.com/cdk/)) to define the infrastructure it deploys.

(Optional) To provide your users interaction with sample data, you can deploy Galileo with a sample dataset of US Supreme Court decision documents.

## User Experience

Once you deploy the reference sample (Galileo), the default web interface, displays an active chat session, session management features (rename, delete, etc.), as well as the chat developer settings panel (collapsed).

![User Experience](galileo-chat.png)

## Architecture

This architecture diagram shows the key service components used to implement each of the three tiers described described in the [mental model](./model/index.md).

![Architecture](../assets/images/galileo-arch.png)

## Tooling

**Meeting development teams where they are - between notebooks and application code.**

New LLMs are being released frequently, which is why Galileo focuses on model agnostic integration and supporting developers to try out the latest LLMs against the full application with zero code.

![Alt text](tooling.png)

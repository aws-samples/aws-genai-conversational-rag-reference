# Demo Corpus Docker (API Lambda + Pipeline Container)

> ATTENTION: this will be refactored soon to use standard lambda function and contain now that embedding model has been removed, which required hybrid container (python + nodejs).

This folder defines the custom docker image used for the corpus API Lambda and Pipeline Container.

Previously this was a hybrid container, python and nodejs, with python being used for the local embedding model (sentence transformer) and nodejs being used for all the logic.

To support developers changing the embedding model or using external embedding endpoint, this has been removed and now this is only a nodejs image. This can now be drastically simplified and will be soon, but in the interim this folder still exists to prevent large premature refactoring.

Embedding is now using SageMaker endpoint with batch sentence embeddings, and based on benchmarking it is actually faster for both single and multiple (1000) sentence embeddings. Initially benchmarking indicated a 10x improvement by having the model locally, but either the benchmarking was not apples to apples, or something changed since then in our local approach. Either way, using SageMaker now drastically simplifies ability to modify the embedding process for consumers and opens flexibility for "workspaces" (multiple datasets/engines for RAG).

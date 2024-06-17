# GenAI Conversational RAG Reference

> Codename: "Galileo"

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

> All classes are under active development and subject to non-backward compatible changes or removal in any future version. These are not subject to the [Semantic Versioning](https://semver.org/) model.
>
> While you can still use these classes, you may need to update your source code when upgrading to a newer version of this package.

Conversational generative AI applications that provide search and summarisation against a collection of private documents (also known as "retrieval augmented generation" or RAG) contain a number of complex components.
These include:

- An elastic document ingestion pipeline,
- A special purpose vector store for document embeddings,
- A performant embeddings inference engine,
- API access to an aligned large language model, and
- The combined functionality exposed via a user interface that maintains session persistance and is secured with authN.

Galileo was created to provide all of these things, integrated into a reference application.

### Use case

The use case for this reference application is a virtual legal research assistant, capable of answering questions against US Supreme Court decisions.

![](./docs/content/assets/images/ux-screenshot.png)

For more information, refer to the [Galileo Generative AI Reference Sample documentation](https://aws-samples.github.io/aws-genai-conversational-rag-reference).

---

## Key documentation links

- **[Overview](https://aws-samples.github.io/aws-genai-conversational-rag-reference/overview/)**
  - **[Mental Model](https://aws-samples.github.io/aws-genai-conversational-rag-reference/overview/model/)**
  - **[How it Works](https://aws-samples.github.io/aws-genai-conversational-rag-reference/overview/how/)**
  - **[Security considerations](https://aws-samples.github.io/aws-genai-conversational-rag-reference/overview/security/)**
- **[Getting started](https://aws-samples.github.io/aws-genai-conversational-rag-reference/getting-started/)**
- **[Developer Guide](https://aws-samples.github.io/aws-genai-conversational-rag-reference/developer-guide/)**
- **[How to contribute](https://aws-samples.github.io/aws-genai-conversational-rag-reference/contributing/)**

---

## Disclaimer: Use of Third-Party models

By using this sample, you agree that you may be deploying third-party models (“Third-Party Model”) into your specified user account. AWS does not own and does not exercise any control over these Third-Party Models. You should perform your own independent assessment, and take measures to ensure that you comply with your own specific quality control practices and standards, and the local rules, laws, regulations, licenses and terms of use that apply to you, your content, and the Third-Party Models, and any outputs from the Third-Party Models. AWS does not make any representations or warranties regarding the Third-Party Models.

## Disclaimer: Use of Prompt Engineering Templates

Any prompt engineering template is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this prompt engineering template in your production accounts, or on production, or other critical data. You are responsible for testing, securing, and optimizing the prompt engineering as appropriate for production grade use based on your specific quality control practices and standards. AWS may reuse this prompt engineering template in future engagements, but we will not share your confidential data nor your intellectual property with other customers.

## Security Considerations

> The sample code, software libraries, command line tools, proofs of concept, templates, or other related technology (including any of the foregoing that are provided by our personnel) is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

There are a number of security considerations that should be taken into account prior to deploying and utilising this sample. The [security section](https://aws-samples.github.io/aws-genai-conversational-rag-reference/overview/security/) outlines each of these considerations.

## Other useful samples

If you looking to benchmark multiple LLMs and RAG engines in a simple way, refer to the [aws-samples/aws-genai-llm-chatbot](https://github.com/aws-samples/aws-genai-llm-chatbot). That project focuses more on experimentation with models and vector stores, while this project focuses more on building an extendable 3-tier application.

# Path to Production Considerations

--8<-- "disclaimer/third-party-model.md"
--8<-- "disclaimer/prompt-engineering-template.md"

???+ warning "Disclaimer: Path to Production Recommendations"
    The following sections are only recommendations based on patterns and limitations we identified.
    You are responsible for testing, securing, and optimizing your system as appropriate for production grade use based on your specific quality control practices and standards.

## General recommendations on LLMs and Prompt engineering

We collected a few observations related to using multiple-step chains that may be helpful for further optimize your system.

### Using different LLMs for non-standalone prompts

Galileo currently provides 3 different types of prompts:

1. **Classification prompt**: To determine the intention (category) of the user's question, as well as the language it was asked in.
2. **Condense prompt**: To condense the current chat history and supply it as a context for the user's question as well as data retrieval from vector store.
3. **Standalone prompt**: To answer the user's question with the dynamically built context.

If you're using `Claude v2` for all of these prompts, it will result in 3 calls/user question to the LLM. This can be reduced with using different LLMs for different prompts. For example, using `Claude v1` or `Claude Instant` LLMs for the classification and condense prompts would reduce the number of requests to `Claude v2`, while providing similar quality results for the first two prompts.

> Note: Please make sure that you use a model for the classification prompt that recognizes the language(s) you're using in the user's question, in case you use it for language detection (and translation).

### Prompt tuning

Fine tuning prompts may result in lower character count, which can help to overcome token throughput limitations.

Additionally, using simpler instructions will result in shorter response times from the LLM.

> Note: You need to find the balance between optimization and accuracy. Compromising response quality over response time or potential increase of throughput must be carefully evaluated.

### Data optimization

* **History**: Based on thorough tests, you may find that using shorter chat history length may improve speed while still keeping response accuracy.

* **Search filters**: Using the classification step to determine the context of the questions, you may be able to create search filters dynamically that would result in building more accurate context for the LLM to answer the users' questions.

### Compute optimization

Based on your deployed system's usage, you may identify peak load patterns in certain time-slots, or, in general, that the average load of the system is over the built-in limitations of the used LLM(s).

For this scenario, if your LLM is available to deploy in `Sagemaker Jumpstart`, you may consider to setup autoscaling groups matching your usage patterns, and run/host the LLM in `Sagemaker`. This enables you to control the supported throughput of your application, while reducing usage prices: you pay for the usage of the Sagemaker instances on an hourly basis, not per request. However, you need to make sure that your setup follows your application's usage patterns, and you're running the Sagemaker instances and enable them only while peak load. Otherwise, since cost depends on hourly usage, you need to pay for the instances while they are idle or having very low usage.

### Caching

A simple and efficient approach to reduce throughput is to cache questions and the answers generated for them. Multiple caching strategies could be introduced:

* One strategy is to just simply store questions and the generated answers in a database, using simple string-matching lookup (e.g.: `DynamoDB`).
* Using vector store, where the questions are also stored as vectors, and lookups are done through vector-matching (similar to semantic search) with a pre-defined score threshold.

## Security enhancements

### CORS

The current Web Application front-end allows Cross Origin Resource Sharing (CORS) for any domain (since the CloudFront CDN domain is different from that of API Gateway). It is recommended to narrow CORS configuration to only known domains.

### Bucket Versioning, Lifecycle and Delete Protection

This reference architecture does not implement data versioning, lifecycle and delete protection on the deployed S3 buckets.

Consider to:

* Enable versioning for S3 buckets, to track changes.
* Enable lifecycle to move past / not used data to archive. The lifecycle rules must be discussed with all data producing and consuming stakeholders, to make sure there's no unexpected use of data.
* Enable delete protection (using MFA) for S3 buckets, so that no data is accidentally deleted.

### Georestriction

Geo-restriction can be enabled in CloudFront CDN distribution, so that only users from a particular geo-location can access the system. This can further protect the Web Application endpoint from malicious activities.

### CloudFormation Delete Protection

CloudFormation stacks – which are deployed with CDK, and are the final form of the reference sample's Infrastructure as Code – can have delete protection turned on, so that no accidental infrastructure deletion is done.

### Use of Customer Managed Key (CMK)

All data encryption in the scope of the reference sample is done using AWS' Key Management System (KMS) hosted keys. However, in your environment, you can choose to use your own key, managed in KMS.

### Refine both stack and application permissions

Some of the permission details in the stack may still need further refinement to match your use-cases. Please review the source code as well as the overall architecture to decide appropriate approach of integrating your guardrails into the system.

Similarly, the Presentation Tier is constructed only with 2 types of users and some permission segmentation, but in order to fit a Production use-case, it is required that application permission is carefully discussed with your team, role/permission matrix is developed for such system, and associating development is carried out to actualize it.

## Infrastructure and System Enhancements

### Multiple Product Environments

For simplicity, all resources are deployed into one account. Creating multiple accounts to organize all the resources of the solution is a good DevOps practice. A multi-account strategy is important not only to improve governance but also to increase security and control of the resources that support the business. This strategy allows developers, data scientists and data engineers to experiment, innovate, and integrate faster, while keeping the production environment safe and available for your customers.

It is recommended to create at least 3 different AWS accounts, one for each environment: Dev, Staging and Production.

### Dev Environment

Dev Environment should be equipped with the same type of resources as the Production environment, as well as Sagemaker Studio/Notebook where data scientist can experiment with developing the machine learning solution.

### Staging Environment

Similar to the Dev Environment, Staging Environment should have the same type of resources like in the Production Environment. And it is used to run fully end-to-end integration tests before the infrastructure as code changes or the new models are deployed to the Production Environment.

### Production Environment

Production Environment is a more tightly controlled environment used to serve inferences on real-world data for real-world customers. All the infrastructure changes and new models must be fully tested before being deployed to Production Environment.

# Prompting best practices

Some basic principles of prompt engineering are:

### 1. Specify Context and Set User Role

Frame the domain area and background situational elements relevant to the query while defining a specific persona like `customer`, `manager` that implies certain goals and expectations.

### 2. State Intent Directly and Prune Ambiguity

Plainly articulate the information needs in the prompt while qualifying key terminology and constraints to limit multiple interpretations.

### 3. Encourage Conciseness

Structure prompt syntax to channel the desirable depth and breadth concisely using contextual and positional markers.

### 4. Evaluate and Refine

Continuously test and refine prompts based on review of model outputs to reinforce relevance through positive and negative feedback.

Some common techniques currently used for prompt engineering for information retrieval include, but not limited to:

* **Zero-Shot Prompting**: Zero-shot prompting in information retrieval involves querying a system without any specific training examples. This technique relies on the model's pre-existing knowledge and generalization capabilities to generate relevant responses. It's particularly useful when there is limited annotated data or when adapting to new domains.

* **Few-Shot Prompting**: Few-shot prompting extends the concept of zero-shot prompting by providing a small set of examples to guide the model's understanding. This approach leverages a minimal amount of labeled data to fine-tune the model for more specific tasks. It strikes a balance between the adaptability of zero-shot techniques and the task specificity of fully supervised learning.

* **Prompt Engineering for Intent Classification**: In information retrieval systems, understanding user intent is crucial. Crafting prompts that explicitly convey user intentions helps in retrieving more accurate and relevant results. This involves carefully selecting and framing prompts to guide the model towards discerning the underlying user queries and intents.

* **Chain-of-Thoughts Prompting**: Chain-of-thoughts prompting involves structuring prompts in a sequential manner, encouraging the model to follow a logical chain of reasoning. This technique helps in maintaining context and coherence across responses, leading to more coherent and informative outputs.

Refer to guidelines such as [Amazon Bedrock Prompt engineering guideline](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html) for more details and examples.

Another key learning is that each LLM has its own optimal prompt structure. Thus, it is recommended that each model prompt engineering and parameter tuning are conducted separately and customized for each model (based on its training data and process).

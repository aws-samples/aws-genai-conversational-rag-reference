--8<-- "disclaimer/third-party-model.md"

| Provider    | Model       | Instance / Size  | Model Status^1^         | Prompt Status^2^        | Notes                                                                                             |
| ----------- | ----------- | ---------------- | -------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `SageMaker` | Falcon Lite | `ml.g5.12xlarge` | :material-check-all: | :material-check-all: | Quite stable and great for general purpose, flexible prompt engineering                           |
| `SageMaker` | Falcon 7B   | `ml.g5.16xlarge` | :material-check:     | :material-check-all: | Prefer Lite version                                                                               |
| `SageMaker` | Falcon 40B  | `ml.g5.48xlarge` | :material-check:     | :material-check-all: | Expensive for unquantifiable benefits, Lite version is preferred at this time                     |
| `SageMaker` | LLama2      | `ml.g5.12xlarge` | :material-check:     | :test_tube:          | Followup questions are inconsistent, and formatting markup in responses - complex prompt engineer |
| `Bedrock`   | Claude V2    | -                | :material-check-all: | :material-check:     | Good results and easy to work with                                                                |
| `Bedrock`   | Jurassic    | -                | :material-check:     | :material-check:     | Should work                                                                                       |
| `Bedrock`   | Titan       | -                | :material-check:     | :material-check:     | Should work                                                                                       |

!!! info "Service Quotas"
    Ensure the necessary [Service Quota](https://console.aws.amazon.com/servicequotas/home/services/sagemaker/quotas) limits for `SageMaker` models meet the capacity of your deployment configurations (`<instance> for endpoint usage`).

??? abstract "Status Keys"
    1. **Model Status**: Defines stability of deployment/integration with model and model/endpoint kwargs configuration optimization.
    2. **Prompt Status**: Defines robustness and adaptability of prompt templates and engineering for this model.

    | Status | Description |
    | -------------------- | ------------------------------------------------------------------------- |
    | - | Not applicable |
    | :question: | Not tested yet, might work, might not |
    | :test_tube: | Very experimental, with high probability of undesirable results or errors |
    | :material-check: | Works for specific use case, but not vetted in the wild |
    | :material-check-all: | Should work for general use cases, but not fully battle tested |
    | :checkered_flag: | Awesome, battled tested and ready for use |

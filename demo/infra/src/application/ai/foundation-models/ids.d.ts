/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
/**
 * Pre-defined foundation model ids.
 */
export declare enum FoundationModelIds {
    FALCON_OA_40B = "falcon-oa-40b",
    FALCON_OA_7B = "falcon-oa-7b",
    FALCON_LITE = "falcon-lite",
    BEDROCK = "bedrock"
}
/**
 * List of pre-defined foundation models to deploy automatically deploy.
 */
export declare const DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST: FoundationModelIds[];
/**
 * Id of the foundation model to use as default for inference engines.
 */
export declare const DEFAULT_FOUNDATION_MODEL_ID = FoundationModelIds.FALCON_LITE;

"use strict";
/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FOUNDATION_MODEL_ID = exports.DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST = exports.FoundationModelIds = void 0;
/**
 * Pre-defined foundation model ids.
 */
var FoundationModelIds;
(function (FoundationModelIds) {
    // Falcon
    FoundationModelIds["FALCON_OA_40B"] = "falcon-oa-40b";
    FoundationModelIds["FALCON_OA_7B"] = "falcon-oa-7b";
    FoundationModelIds["FALCON_LITE"] = "falcon-lite";
    // Bedrock
    FoundationModelIds["BEDROCK"] = "bedrock";
})(FoundationModelIds || (exports.FoundationModelIds = FoundationModelIds = {}));
/**
 * List of pre-defined foundation models to deploy automatically deploy.
 */
exports.DEFAULT_PREDEFINED_FOUNDATION_MODEL_LIST = [
    // FoundationModelIds.FALCON_7B,
    FoundationModelIds.FALCON_LITE,
];
/**
 * Id of the foundation model to use as default for inference engines.
 */
exports.DEFAULT_FOUNDATION_MODEL_ID = FoundationModelIds.FALCON_LITE;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaWRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtxQ0FDcUM7OztBQUVyQzs7R0FFRztBQUNILElBQVksa0JBUVg7QUFSRCxXQUFZLGtCQUFrQjtJQUM1QixTQUFTO0lBQ1QscURBQStCLENBQUE7SUFDL0IsbURBQTZCLENBQUE7SUFDN0IsaURBQTJCLENBQUE7SUFFM0IsVUFBVTtJQUNWLHlDQUFtQixDQUFBO0FBQ3JCLENBQUMsRUFSVyxrQkFBa0Isa0NBQWxCLGtCQUFrQixRQVE3QjtBQUVEOztHQUVHO0FBQ1UsUUFBQSx3Q0FBd0MsR0FBeUI7SUFDNUUsZ0NBQWdDO0lBQ2hDLGtCQUFrQixDQUFDLFdBQVc7Q0FDL0IsQ0FBQztBQUVGOztHQUVHO0FBQ1UsUUFBQSwyQkFBMkIsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiEgQ29weXJpZ2h0IFtBbWF6b24uY29tXShodHRwOi8vYW1hem9uLmNvbS8pLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMCAqL1xuXG4vKipcbiAqIFByZS1kZWZpbmVkIGZvdW5kYXRpb24gbW9kZWwgaWRzLlxuICovXG5leHBvcnQgZW51bSBGb3VuZGF0aW9uTW9kZWxJZHMge1xuICAvLyBGYWxjb25cbiAgRkFMQ09OX09BXzQwQiA9IFwiZmFsY29uLW9hLTQwYlwiLFxuICBGQUxDT05fT0FfN0IgPSBcImZhbGNvbi1vYS03YlwiLFxuICBGQUxDT05fTElURSA9IFwiZmFsY29uLWxpdGVcIixcblxuICAvLyBCZWRyb2NrXG4gIEJFRFJPQ0sgPSBcImJlZHJvY2tcIixcbn1cblxuLyoqXG4gKiBMaXN0IG9mIHByZS1kZWZpbmVkIGZvdW5kYXRpb24gbW9kZWxzIHRvIGRlcGxveSBhdXRvbWF0aWNhbGx5IGRlcGxveS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUFJFREVGSU5FRF9GT1VOREFUSU9OX01PREVMX0xJU1Q6IEZvdW5kYXRpb25Nb2RlbElkc1tdID0gW1xuICAvLyBGb3VuZGF0aW9uTW9kZWxJZHMuRkFMQ09OXzdCLFxuICBGb3VuZGF0aW9uTW9kZWxJZHMuRkFMQ09OX0xJVEUsXG5dO1xuXG4vKipcbiAqIElkIG9mIHRoZSBmb3VuZGF0aW9uIG1vZGVsIHRvIHVzZSBhcyBkZWZhdWx0IGZvciBpbmZlcmVuY2UgZW5naW5lcy5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfRk9VTkRBVElPTl9NT0RFTF9JRCA9IEZvdW5kYXRpb25Nb2RlbElkcy5GQUxDT05fTElURTtcbiJdfQ==
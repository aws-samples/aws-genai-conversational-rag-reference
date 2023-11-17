/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { createMetrics } from '@aws/galileo-sdk/lib/common/metrics';

export { measurable, measure, startPerfMetric as measurer } from '@aws/galileo-sdk/lib/common/metrics';

const [metrics, logMetric] = createMetrics({
  serviceName: 'Corpus',
});

export { metrics, logMetric };

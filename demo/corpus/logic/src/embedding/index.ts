/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { TextDecoder } from 'util';
import { getLogger } from '@aws/galileo-sdk/lib/common';
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { AsyncCallerParams } from 'langchain/dist/util/async_caller';
import { Embeddings } from 'langchain/embeddings/base';
import { ENV } from '../env';
import { chunkArray } from '../indexing/utils';
import { metrics } from '../metrics';

const logger = getLogger('embeddings');

export type Vector = number[];

export class SageMakerEndpointEmbeddings extends Embeddings {
  readonly client: SageMakerRuntimeClient;

  readonly maxSentences: number = 100;

  constructor(params: AsyncCallerParams) {
    super(params);

    this.client = new SageMakerRuntimeClient({
      retryMode: 'adaptive',
      maxAttempts: 15,
    });
  }

  protected async _embedText(input: string[]): Promise<Vector[]> {
    const chunks = chunkArray(input, this.maxSentences);
    const results: Vector[] = [];

    for (const chunk of chunks) {
      const $start = Date.now();

      const response = await this.client.send(
        new InvokeEndpointCommand({
          EndpointName: ENV.EMBEDDINGS_SAGEMAKER_ENDPOINT,
          ContentType: 'application/json',
          Body: JSON.stringify({ type: 'embeddings', model: ENV.EMBEDDINGS_SAGEMAKER_MODEL, input: chunk }),
        }),
      );
      metrics.addMetric(
        'Embedding_SageMaker_Per',
        MetricUnits.Milliseconds,
        Math.ceil((Date.now() - $start) / chunk.length),
      );

      const vectors: Vector[] = JSON.parse(new TextDecoder().decode(response.Body));
      logger.debug('SageMakerEndpoint:Invoke:Vectors', { vectors: vectors.length });

      results.push(...vectors);
    }
    return results;
  }

  async embedDocuments(documents: string[]): Promise<Vector[]> {
    return this.caller.callWithOptions({}, this._embedText.bind(this), documents);
  }
  async embedQuery(document: string): Promise<Vector> {
    return (await this.embedDocuments([document]))[0];
  }
}

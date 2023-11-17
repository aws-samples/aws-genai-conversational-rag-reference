/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { MetricResolution, Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { MetricsOptions } from '@aws-lambda-powertools/metrics/lib/types/Metrics.js';

export type { logMetrics, Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';

export interface PerformanceMetricOptions {
  unit?: MetricUnits;
  highResolution?: boolean;
}

/**
 * Creates a perf observer to automatically track performance metrics
 *
 * @returns Callback to disconnect observer
 */
export const startMetricsObserver = (instance: Metrics): (() => void) => {
  const perfObserver = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        const { unit = MetricUnits.Milliseconds, highResolution = false } = (entry.detail ||
          {}) as PerformanceMetricOptions;
        const resolution = highResolution ? MetricResolution.High : MetricResolution.Standard;
        instance.addMetric(entry.name, unit, entry.duration, resolution);
      }
    });
  });

  perfObserver.observe({ entryTypes: ['measure'] });

  return () => perfObserver.disconnect();
};

export type CreateMetricsTuple = [metrics: Metrics, publishCallback: () => void];

/**
 * Creates a bound instance of Metrics including perf observer and logger.
 * @param options
 * @returns Tuple of form [Metrics, Callback] where callback is `logMetric` bound callback
 */
export function createMetrics(options?: MetricsOptions): CreateMetricsTuple {
  const namespace = options?.namespace || process.env.POWERTOOLS_METRICS_NAMESPACE || 'Galileo';
  const serviceName = options?.serviceName || process.env.POWERTOOLS_SERVICE_NAME;

  const metrics = new Metrics({
    ...options,
    namespace,
    serviceName,
  });

  const disconnectObserver = startMetricsObserver(metrics);

  const _callback = () => {
    disconnectObserver();
    metrics.publishStoredMetrics();
  };

  return [metrics, _callback];
}

export function startPerfMetric(metricName: string, options?: PerformanceMetricOptions) {
  const start = performance.now();

  return () => {
    performance.measure(metricName, {
      detail: options,
      duration: performance.now() - start,
    });
  };
}

export function measure(metricName: string, options?: PerformanceMetricOptions) {
  return function _measure<T extends Promise<any> | ((...args: any[]) => any)>(target: T): T {
    if (target instanceof Promise) {
      const stop = startPerfMetric(metricName, options);
      return target.then((v) => {
        stop();
        return v;
      }) as T;
    }
    return ((...args: any[]) => {
      const stop = startPerfMetric(metricName, options);
      const result = target(...args);
      if (result instanceof Promise) {
        return result.then((v) => {
          stop();
          return v;
        });
      }
      stop();
      return result;
    }) as T;
  };
}

export function measurable<T extends {}, P extends (...args: any[]) => any>(
  metricName: string,
  options?: PerformanceMetricOptions,
) {
  return function _measurable(_target: T, propertyKey: keyof T, descriptor: TypedPropertyDescriptor<P>) {
    return {
      get() {
        const fn = measure(metricName, options)(descriptor.value!.bind(this));

        Object.defineProperty(this, propertyKey, {
          value: fn,
          configurable: true,
          writable: true,
        });
        return fn;
      },
    };
  };
}

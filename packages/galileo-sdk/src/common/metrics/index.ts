/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { logMetrics, Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { ExtraOptions, MetricsOptions } from '@aws-lambda-powertools/metrics/lib/types/Metrics.js';

export type { logMetrics, Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';

/**
 * Creates a perf observer to automatically track performance metrics
 *
 * @returns Callback to disconnect observer
 */
export const startMetricsObserver = (instance: Metrics): (() => void) => {
  const perfObserver = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        entry.detail;
        instance.addMetric(entry.name, MetricUnits.Milliseconds, entry.duration);
      }
    });
  });

  perfObserver.observe({ entryTypes: ['measure'] });

  return () => perfObserver.disconnect();
};

/**
 * Creates a bound instance of Metrics including perf observer and logger.
 * @param options
 * @returns Tuple of form [Metrics, Callback] where callback is `logMetric` bound callback
 */
export function createMetrics(options?: MetricsOptions): [Metrics, (options?: ExtraOptions) => void] {
  const metrics = new Metrics({
    ...options,
    namespace: options?.namespace || process.env.POWERTOOLS_METRICS_NAMESPACE || 'Galileo',
    serviceName: options?.serviceName || process.env.POWERTOOLS_SERVICE_NAME,
  });

  const disconnectObserver = startMetricsObserver(metrics);

  const _callback = (extraOptions?: ExtraOptions) => {
    disconnectObserver();
    logMetrics(metrics, extraOptions);
  };

  return [metrics, _callback];
}

export function startPerfMetric(metricName: string) {
  performance.mark(`start::${metricName}`);

  return () => {
    performance.mark(`stop::${metricName}`);
    performance.measure(metricName, `start::${metricName}`, `stop::${metricName}`);
  };
}

export function measure(metricName: string) {
  return function _measure<T extends Promise<any> | ((...args: any[]) => any)>(target: T): T {
    if (target instanceof Promise) {
      const stop = startPerfMetric(metricName);
      return target.then((v) => {
        stop();
        return v;
      }) as T;
    }
    return ((...args: any[]) => {
      const stop = startPerfMetric(metricName);
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

export function measurable<T extends {}, P extends (...args: any[]) => any>(metricName: string) {
  return function _measurable(_target: T, propertyKey: keyof T, descriptor: TypedPropertyDescriptor<P>) {
    return {
      get() {
        const fn = measure(metricName)(descriptor.value!.bind(this));

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

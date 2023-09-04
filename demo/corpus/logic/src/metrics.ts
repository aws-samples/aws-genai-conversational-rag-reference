/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';

export const metrics = new Metrics({
  namespace: process.env.POWERTOOLS_METRICS_NAMESPACE || process.env.POWERTOOLS_SERVICE_NAME || 'Galileo',
  serviceName: 'Corpus',
});

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    if (entry.entryType === 'measure') {
      entry.detail;
      metrics.addMetric(entry.name, MetricUnits.Milliseconds, entry.duration);
    }
  });
});

perfObserver.observe({ entryTypes: ['measure'] });

export function measurer(metricName: string) {
  performance.mark(`start::${metricName}`);

  return () => {
    performance.mark(`stop::${metricName}`);
    performance.measure(metricName, `start::${metricName}`, `stop::${metricName}`);
  };
}

export function measure(metricName: string) {
  return function _measure<T extends Promise<any> | ((...args: any[]) => any)>(
    target: T,
  ): T {
    if (target instanceof Promise) {
      const stop = measurer(metricName);
      return target.then((v) => {
        stop();
        return v;
      }) as T;
    }
    return ((...args: any[]) => {
      const stop = measurer(metricName);
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

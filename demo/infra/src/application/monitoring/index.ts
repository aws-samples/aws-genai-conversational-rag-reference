/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { ApplicationContext } from "@aws/galileo-cdk/src/core/app/context";
import { NestedStack, NestedStackProps, Stack, StackProps } from "aws-cdk-lib";
import { Topic } from "aws-cdk-lib/aws-sns";
import { pascal } from "case";
import {
  DefaultDashboardFactory,
  MonitoringAspectProps,
  MonitoringFacade,
  SnsAlarmActionStrategy,
} from "cdk-monitoring-constructs";
import { Construct } from "constructs";

export interface MonitoringOptions {
  /**
   * Set the name of the dashboard.
   * @default Derived from stage+application+stack names
   */
  readonly dashboardName?: string;
  /**
   * Indicates if the stack scope is automatically monitored
   * @default true
   */
  readonly monitorStack?: boolean;

  readonly monitorStackProps?: MonitoringAspectProps;
}
export interface MonitoredNestedStackProps extends NestedStackProps {
  readonly monitoring?: MonitoringOptions;
}
export interface MonitoredStackProps extends StackProps {
  readonly monitoring?: MonitoringOptions;
}

export class MonitoredNestedStack extends NestedStack {
  readonly monitoring: MonitoringFacade;

  constructor(scope: Construct, id: string, props?: MonitoredNestedStackProps) {
    super(scope, id, props);

    this.monitoring = new StackMonitor(this, props?.monitoring || {}).facade;
  }
}

export class MonitoredStack extends Stack {
  readonly monitoring: MonitoringFacade;

  constructor(scope: Construct, id: string, props?: MonitoredStackProps) {
    super(scope, id, props);

    this.monitoring = new StackMonitor(this, props?.monitoring || {}).facade;
  }
}

class StackMonitor extends Construct {
  readonly facade: MonitoringFacade;

  constructor(stack: Stack, props: MonitoringOptions) {
    super(stack, "StackMonitor");

    const onAlarmTopic = new Topic(this, "AlarmTopic");

    const dashboardName =
      props.dashboardName ??
      `${ApplicationContext.getMetricNamespace(stack)}-${stack.node.id}`;

    this.facade = new MonitoringFacade(this, "Monitoring", {
      alarmFactoryDefaults: {
        actionsEnabled: false,
        alarmNamePrefix: pascal(this.node.path),
        action: new SnsAlarmActionStrategy({ onAlarmTopic }),
      },
      metricFactoryDefaults: {
        namespace: ApplicationContext.getMetricNamespace(this),
      },
      dashboardFactory: new DefaultDashboardFactory(this, "Dashboard", {
        dashboardNamePrefix: dashboardName,
      }),
    });

    if (props.monitorStack !== false) {
      this.facade.monitorScope(
        stack,
        props.monitorStackProps || {
          // Disabling these for now because creates empty summary on all dashboard
          // and we need to wire it up a bit more + document billing enablement + etc.
          ec2: { enabled: false },
          billing: { enabled: false },
          elasticCache: { enabled: false },
        }
      );
    }
  }
}

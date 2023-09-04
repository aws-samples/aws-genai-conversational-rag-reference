/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { isDevStage, stageAwareRemovalPolicy } from "../context";

export interface AppDataLayerProps {}

export class AppDataLayer extends Construct {
  readonly datastore: Table;
  readonly gsiIndexName = "GSI1";

  constructor(scope: Construct, id: string, _props?: AppDataLayerProps) {
    super(scope, id);

    const dev = isDevStage(this);

    // Create the datastore for the CRUD operations
    this.datastore = new Table(this, "Datastore", {
      partitionKey: {
        name: "PK",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: stageAwareRemovalPolicy(this),
      pointInTimeRecovery: !dev,
    });

    this.datastore.addGlobalSecondaryIndex({
      indexName: this.gsiIndexName,
      partitionKey: {
        name: "GSI1PK",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "GSI1SK",
        type: AttributeType.STRING,
      },
    });
  }
}

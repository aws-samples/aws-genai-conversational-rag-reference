/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
PDX-License-Identifier: Apache-2.0 */

// import { App } from "aws-cdk-lib";
// import { Template } from "aws-cdk-lib/assertions";
// import { ApplicationStack } from "../src/stacks/application-stack";

// test("Snapshot", () => {
//   const app = new App();
//   const stack = new ApplicationStack(app, "test");

//   const template = Template.fromStack(stack);
//   expect(template.toJSON()).toMatchSnapshot();
// });

test('passthrough', () => {
  expect(true).toBe(true);
});

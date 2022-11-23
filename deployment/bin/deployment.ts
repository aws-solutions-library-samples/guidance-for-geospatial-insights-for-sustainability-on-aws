#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GeospatialETLStack } from '../lib/geospatial-etl-stack';

const app = new cdk.App();
new GeospatialETLStack(app, 'GeospatialETLStack', {
  description: "(SO9107) Guidance for Geospatial Insights for Sustainability on AWS v1 - This solution guidance demonstrates how to observe vegetation changes using geospatial data, allowing sustainability and procurement teams to understand and verify if environmental best practices are followed at supply chain origins"
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { 
  //   process.env.CDK_DEFAULT_ACCOUNT, 
  //   region: 'us-east-1' 
  // },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
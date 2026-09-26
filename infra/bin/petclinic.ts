#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PetclinicStack } from '../lib/petclinic-stack';

const app = new cdk.App();

const envName = app.node.tryGetContext('envName') ?? 'dev';
const imageTag = app.node.tryGetContext('imageTag') ?? '0.0.0-placeholder';
const certificateArn = app.node.tryGetContext('certificateArn');
const buildFromSource = app.node.tryGetContext('buildFromSource') === 'true';

new PetclinicStack(app, `Petclinic-${envName}`, {
  envName,
  imageTag,
  certificateArn,
  buildFromSource,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: `Spring PetClinic on ECS Fargate with RDS PostgreSQL (${envName})`,
});

app.synth();

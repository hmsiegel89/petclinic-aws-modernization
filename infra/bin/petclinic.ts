#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PetclinicStack } from '../lib/petclinic-stack';

const app = new cdk.App();

const envName = app.node.tryGetContext('envName') ?? 'dev';
const imageTag = app.node.tryGetContext('imageTag') ?? 'latest';

new PetclinicStack(app, `Petclinic-${envName}`, {
  envName,
  imageTag,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: `Spring PetClinic on ECS Fargate with RDS PostgreSQL (${envName})`,
});

app.synth();

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ContainerService } from './container-service';
import { Database } from './database';
import { Monitoring } from './monitoring';
import { Network } from './network';

export interface PetclinicStackProps extends cdk.StackProps {
  readonly envName: string;
  readonly imageTag: string;
  readonly buildFromSource?: boolean;
  readonly certificateArn?: string;
}

export class PetclinicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PetclinicStackProps) {
    super(scope, id, props);

    const network = new Network(this, 'Network');

    const database = new Database(this, 'Database', {
      vpc: network.vpc,
      envName: props.envName,
    });

    const app = new ContainerService(this, 'App', {
      vpc: network.vpc,
      envName: props.envName,
      imageTag: props.imageTag,
      dbSecret: database.secret,
      dbEndpoint: database.instance.dbInstanceEndpointAddress,
      dbPort: database.instance.dbInstanceEndpointPort,
      dbName: database.databaseName,
      buildFromSource: props.buildFromSource,
      certificateArn: props.certificateArn,
    });

    database.allowFrom(app.service, 'PetClinic Fargate tasks');

    new Monitoring(this, 'Monitoring', {
      envName: props.envName,
      service: app.service,
      loadBalancer: app.loadBalancer,
      targetGroup: app.targetGroup,
      database: database.instance,
      logGroup: app.logGroup,
    });

    cdk.Tags.of(this).add('Application', 'petclinic');
    cdk.Tags.of(this).add('Environment', props.envName);

    new cdk.CfnOutput(this, 'LoadBalancerUrl', {
      value: `${props.certificateArn ? 'https' : 'http'}://${app.loadBalancer.loadBalancerDnsName}`,
      description: 'Public URL of the application load balancer',
    });
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: app.repository.repositoryUri,
      description: 'ECR repository to push application images to',
    });
    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: database.secret.secretArn,
      description: 'Secrets Manager secret holding the database credentials',
    });
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: app.logGroup.logGroupName,
      description: 'CloudWatch log group for application logs',
    });
  }
}

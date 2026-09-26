import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ContainerServiceProps {
  readonly vpc: ec2.IVpc;
  readonly envName: string;
  readonly imageTag: string;
  /** Secret holding the RDS generated credentials (username/password/host/port). */
  readonly dbSecret: secretsmanager.ISecret;
  readonly dbEndpoint: string;
  readonly dbPort: string;
  readonly dbName: string;
  readonly containerPort?: number;
  readonly healthCheckPath?: string;
  readonly desiredCount?: number;
  readonly minCapacity?: number;
  readonly maxCapacity?: number;
}

/**
 * ECR repository, Fargate service and internet-facing ALB, with CPU based
 * target-tracking autoscaling and container logs in CloudWatch.
 */
export class ContainerService extends Construct {
  public readonly repository: ecr.Repository;
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ContainerServiceProps) {
    super(scope, id);

    const containerPort = props.containerPort ?? 8080;
    const healthCheckPath = props.healthCheckPath ?? '/';

    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `petclinic-${props.envName}`,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      encryption: ecr.RepositoryEncryption.AES_256,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        { description: 'Keep the last 10 images', maxImageCount: 10 },
      ],
    });

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: `petclinic-${props.envName}`,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/petclinic-${props.envName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: 1024,
      memoryLimitMiB: 2048,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    const jdbcUrl = `jdbc:postgresql://${props.dbEndpoint}:${props.dbPort}/${props.dbName}`;

    taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository, props.imageTag),
      portMappings: [{ containerPort, protocol: ecs.Protocol.TCP }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'app', logGroup: this.logGroup }),
      environment: {
        SPRING_PROFILES_ACTIVE: 'postgres',
        JDBC_URL: jdbcUrl,
        POSTGRES_URL: jdbcUrl,
        POSTGRES_HOST: props.dbEndpoint,
        POSTGRES_PORT: props.dbPort,
        POSTGRES_DB: props.dbName,
      },
      secrets: {
        POSTGRES_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        POSTGRES_PASS: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
      },
      healthCheck: {
        command: ['CMD-SHELL', `curl -f http://localhost:${containerPort}${healthCheckPath} || exit 1`],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(120),
      },
    });

    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc: props.vpc,
      description: 'PetClinic Fargate tasks',
      allowAllOutbound: true,
    });

    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition,
      desiredCount: props.desiredCount ?? 2,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [serviceSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(180),
      circuitBreaker: { rollback: true },
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      enableExecuteCommand: true,
    });

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      idleTimeout: cdk.Duration.seconds(60),
    });

    const listener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: true,
    });

    this.targetGroup = listener.addTargets('FargateTargets', {
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.service],
      deregistrationDelay: cdk.Duration.seconds(30),
      healthCheck: {
        path: healthCheckPath,
        healthyHttpCodes: '200-399',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: props.minCapacity ?? 2,
      maxCapacity: props.maxCapacity ?? 6,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 60,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.minutes(1),
    });
  }

  public get connections(): ec2.Connections {
    return this.service.connections;
  }
}

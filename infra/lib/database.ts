import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface DatabaseProps {
  readonly vpc: ec2.IVpc;
  readonly envName: string;
  readonly databaseName?: string;
  readonly instanceType?: ec2.InstanceType;
}

/**
 * Multi-AZ PostgreSQL instance in the isolated subnets. Credentials are generated
 * by RDS and stored in Secrets Manager.
 */
export class Database extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly secret: rds.DatabaseSecret;
  public readonly databaseName: string;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.databaseName = props.databaseName ?? 'petclinic';

    this.secret = new rds.DatabaseSecret(this, 'Credentials', {
      username: 'petclinic',
      excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
    });

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_4,
    });

    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine,
      description: 'PetClinic PostgreSQL parameters',
      parameters: {
        'rds.force_ssl': '1',
      },
    });

    this.instance = new rds.DatabaseInstance(this, 'Postgres', {
      engine,
      parameterGroup,
      instanceType:
        props.instanceType ?? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: this.databaseName,
      multiAz: true,
      allocatedStorage: 50,
      maxAllocatedStorage: 200,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: props.envName === 'prod',
      removalPolicy:
        props.envName === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.SNAPSHOT,
      cloudwatchLogsExports: ['postgresql', 'upgrade'],
      enablePerformanceInsights: true,
      autoMinorVersionUpgrade: true,
    });
  }

  /** Allow the given peer (e.g. the Fargate service security group) to reach Postgres. */
  public allowFrom(peer: ec2.IConnectable, description: string): void {
    this.instance.connections.allowDefaultPortFrom(peer, description);
  }
}

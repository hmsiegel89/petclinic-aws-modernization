import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface MonitoringProps {
  readonly envName: string;
  readonly service: ecs.FargateService;
  readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  readonly targetGroup: elbv2.ApplicationTargetGroup;
  readonly database: rds.DatabaseInstance;
  readonly logGroup: logs.LogGroup;
}

/** CloudWatch dashboard covering the load balancer, the service and the database. */
export class Monitoring extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `petclinic-${props.envName}`,
      defaultInterval: cdk.Duration.hours(3),
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ALB requests and errors',
        width: 12,
        left: [props.loadBalancer.metrics.requestCount()],
        right: [
          props.loadBalancer.metrics.httpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT),
          props.targetGroup.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT),
        ],
      }),
      new cloudwatch.GraphWidget({
        title: 'ALB latency (p50/p99)',
        width: 12,
        left: [
          props.loadBalancer.metrics.targetResponseTime({ statistic: 'p50', label: 'p50' }),
          props.loadBalancer.metrics.targetResponseTime({ statistic: 'p99', label: 'p99' }),
        ],
      }),
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'ECS service utilization',
        width: 12,
        left: [props.service.metricCpuUtilization(), props.service.metricMemoryUtilization()],
      }),
      new cloudwatch.GraphWidget({
        title: 'Healthy vs unhealthy targets',
        width: 12,
        left: [
          props.targetGroup.metrics.healthyHostCount(),
          props.targetGroup.metrics.unhealthyHostCount(),
        ],
      }),
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'RDS CPU and connections',
        width: 12,
        left: [props.database.metricCPUUtilization()],
        right: [props.database.metricDatabaseConnections()],
      }),
      new cloudwatch.GraphWidget({
        title: 'RDS storage and memory',
        width: 12,
        left: [props.database.metricFreeStorageSpace()],
        right: [props.database.metricFreeableMemory()],
      }),
    );

    this.dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Recent application errors',
        width: 24,
        logGroupNames: [props.logGroup.logGroupName],
        queryLines: [
          'fields @timestamp, @message',
          'filter @message like /(?i)(error|exception)/',
          'sort @timestamp desc',
          'limit 50',
        ],
      }),
    );
  }
}

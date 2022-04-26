import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";

export class AnomalyDetection extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    //////////////////////////////////////////////////////////////////////////
    // DynamoDB configuration
    const dynamoTable = new Table(this, 'AnomalyDetectionDB', {
      partitionKey: {
        name: 'arn',
        type: AttributeType.STRING
      },
      tableName: 'anomaly-detection',

      /**
       * The default removal policy is RETAIN, which means that cdk destroy
       * will not attempt to delete the new table, and it will remain in your
       * account until manually deleted. By setting the policy to DESTROY, cdk
       * destroy will delete the table (even if it has data in it)
       */
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });


    //////////////////////////////////////////////////////////////////////////
    // Lambda configuration
    const handler = new lambda.Function(this, "AnomalyDetection", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "index.handler"
    });

    // Grant Lambda permissions
    dynamoTable.grantReadWriteData(handler);
    cloudwatch.Metric.grantPutMetricData(handler);

    const ebsPolicy = new iam.PolicyStatement({
      actions: ['ebs:ListChangedBlocks'],
      resources: ['*'],
    });
    const cwPolicy = new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricAlarm'],
      resources: ['*'],
    })

    handler.role?.attachInlinePolicy(
      new iam.Policy(this, 'AnomalyDetectionInlinePolicy', {
        statements: [ebsPolicy, cwPolicy],
      }),
    );

    //////////////////////////////////////////////////////////////////////////
    // EventBridge configuration
    const rule = new events.Rule(this, 'AnomalyDetectionRule', {
      eventPattern: {
        source: ["aws.backup"],
        detailType: ["Backup Job State Change"],
        detail: {
          resourceType: ["EBS"],
          state: ["COMPLETED"]
        },
      },
    });
    rule.addTarget(new targets.LambdaFunction(handler, {
      retryAttempts: 2,
    }));

  }
}
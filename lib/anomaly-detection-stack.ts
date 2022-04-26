import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as anomaly_detection from '../lib/anomaly-detection';

export class AnomalyDetectionStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    new anomaly_detection.AnomalyDetection(this, 'AnomalyDetection');
  }
}

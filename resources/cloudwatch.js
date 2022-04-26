const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

const RESOURCE = 'BACKUP_RESOURCE';
const METRIC_NAME = 'BACKUP_CHANGED_BLOCKS';
const NAMESPACE = 'BACKUP';

/**
 * Create a CloudWatch alarm using anomaly detection. The alarm will be
 * triggered when the number of changed blocks has exceeded the
 * modeled threshold.
 * @param  {String}  arn The ARN to identify in the alarm
 * @return {Promise}     A promise to create a CloudWatch alarm
 */
exports.addAlarm = async(arn) => {
  const alarm = {
    AlarmName: `Backup-Anomaly-Alarm/${arn}`,
    AlarmDescription: `Backup-Anomaly-Alarm/${arn}`,
    ComparisonOperator: "GreaterThanUpperThreshold",
    EvaluationPeriods: "1",
    TreatMissingData: "ignore",
    ThresholdMetricId: "ad1",
    Metrics: [
      {
        Id: "ad1",
        Expression: "ANOMALY_DETECTION_BAND(m1)",
        Label: "Changed Blocks Exceeded",
        ReturnData: true
      },
      {
        Id: "m1",
        MetricStat: {
          Metric: {
            Dimensions: [
              {
                Name: RESOURCE,
                Value: arn
              }
            ],
            MetricName: METRIC_NAME,
            Namespace: NAMESPACE
          },
          Period: "60",
          Stat: "Maximum",
        },
        ReturnData: true
      }
    ]
  };

  console.log("Creating Alarm...: ", alarm);
  return cloudwatch.putMetricAlarm(alarm).promise();
};

/**
 * Add a CloudWatch custom metric for the number of changed blocks identified
 * between 2 different snapshots.
 * @param  {String}  arn           The ARN from which the snapshots were taken
 * @param  {String}  changedBlocks The percent change from last backup
 * @return {Promise}               A promise to add a Cloudwatch metric
 */
exports.addMetric = async (arn, changedBlocks) => {
  const metric = {
    MetricData: [
      {
        MetricName: METRIC_NAME,
        Dimensions: [
          {
            Name: RESOURCE,
            Value: arn
          }
        ],
        Value: changedBlocks
      },
    ],
    Namespace: NAMESPACE
  };

  console.log("Publishing Metric...: ", metric);
  return cloudwatch.putMetricData(metric).promise();
};

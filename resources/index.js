const ebs = require('./ebs');
const dynamodb = require('./dynamodb');
const cloudwatch = require('./cloudwatch');

/**
 * Get the snapshot from the given resource string
 * @param  {String} resource A resource string containing a snapshot
 * @return {String}          A snapshot string
 */
const getSnapshot = (resource) => {
  const regex = /snap-[0-9a-f]+$/g;
  return (resource.match(regex))[0];
};

/**
 * Get the volume from the given resource string
 * @param  {String} resource A resource string containing a volume
 * @return {String}          A volume string
 */
const getVolume = (resource) => {
  const regex = /vol-[0-9a-f]+$/g;
  return (resource.match(regex))[0];
};

/**
 * Perform anomaly detection process by comparing current and previous
 * snapshots for number of changed blocks
 * @param {String} arn   The EBS volume ARN
 * @param {String} event The incoming AWS backup event
 */
const anomalyDetection = async (arn, event) => {
  // Get Volume details
  const item = await dynamodb.getItem(arn);
  console.log(item);

  // The snapshot that was just backup up
  const currentSnap = getSnapshot(event.resources[0]);

  // Got a matching ARN -- not the first backup for this EBS volume
  if (Object.keys(item).length !== 0) {

    // Compare current with this previous snapshot
    const prevSnap = item.Item.snapshot;

    // Let's see how many blocks changed between the current
    // and previous snapshots
    const totalChangedBlocks = await ebs.calcTotalChangedBlocks(currentSnap, prevSnap);
    console.log("Total Changed Blocks...: ", totalChangedBlocks);

    // Add a custom CloudWatch metric with the number of changed blocks between
    // the 2 snapshots for the EBS volume
    await cloudwatch.addMetric(arn, totalChangedBlocks);

  // No ARN -- first time backing up this EBS volume, so let's create
  // an alarm for our volume
  } else {
    await cloudwatch.addAlarm(arn);
    console.log("New backup...: ", arn);
  }

  // Save the ARN details for this latest backup
  await dynamodb.putItem(arn, currentSnap);
};

/**
 * Lambda event handler
 * @param  {Object} event The event coming from EventBridge
 * @return {Object}       The handler's status
 */
exports.handler = async (event) => {
  console.log(event);

  try {
    const arn = event.detail.resourceArn;

    // Determine if this volume should have anomaly detection activated
    // based on its tags
    const volume = getVolume(arn);
    const isEligible = await ebs.isEligible(volume);

    if (isEligible) {
      await anomalyDetection(arn, event);
    } else {
      console.log("Not eligible for anomaly detection...: ", arn);
    }

    return (200);
  } catch (err) {
    console.log(err);
    return (err);
  }
};

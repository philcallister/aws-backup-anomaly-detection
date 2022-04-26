const ebs = require('./ebs');
const dynamodb = require('./dynamodb');
const cloudwatch = require('./cloudwatch');

/**
 * Get the snapshot from the given resource string
 * @param  {String} resource A resource string containing a snapshot
 * @return {String}          A snapshot string
 */
function getSnapshot(resource) {
  const regex = /snap-[0-9a-f]+$/g;
  return (resource.match(regex))[0];
}

/**
 * Lambda event handler
 * @param  {Object} event The event coming from EventBridge
 * @return {Object}       The handler's status
 */
exports.handler = async (event) => {
  console.log(event);

  try {
    const arn = event.detail.resourceArn;

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
      var totalChangedBlocks = await ebs.calcTotalChangedBlocks(currentSnap, prevSnap);
      console.log("Total Changed Blocks...: ", totalChangedBlocks);

      // Add a custom CloudWatch metric with the number of changed blocks between
      // the 2 snapshots for the EBS volume
      await cloudwatch.addMetric(arn, totalChangedBlocks);

    // No ARN -- first time backing up this EBS volume, so let's create
    // an alarm for our volume
    } else {
      await cloudwatch.addAlarm(arn);
      console.log("New backup...");
    }

    // Save the ARN details for this latest backup
    await dynamodb.putItem(arn, currentSnap);

    return (200);
  } catch (err) {
    console.log(err);
    return (err);
  }
};

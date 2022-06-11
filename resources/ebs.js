const AWS = require('aws-sdk');
const ebs = new AWS.EBS();
const ec2 = new AWS.EC2();

/**
 * Retrieve the next set of changed blocks when comparing the snapshots
 * given in the 'params'
 * @param  {Object}  params The snapshots to compare
 * @return {Promise} A promise to return an array of changed blocks
 */
const snapshotChangedBlocks = async (params) => {
  return await ebs.listChangedBlocks(params).promise();
};

/**
 * Retrieve the volumes matching the given volume ID (should be 1)
 * @param  {String}  vol The volume ID to match
 * @return {Promise} A promise to return the matching volume description
 */
const describeVolumes = async (vol) => {
  const params = {
    VolumeIds: [vol]
  };
  return await ec2.describeVolumes(params).promise();
};

/**
 * Determine if this EBS volume should be processed based on its tags
 * @param  {String} volume The volume currently being backed up
 * @return {boolean}       true=the EBS volume should be processed /
 *                         false=skip this volume
 */
exports.isEligible = async (volume) => {
  const volumes = await describeVolumes(volume);
  if (volumes?.Volumes?.length > 0) {
    const volume = volumes.Volumes[0];
    if (volume?.Tags?.length > 0) {
      const tags = volume.Tags;
      const found = tags.find(e => e.Key === process.env.TAG_KEY_EBS);
      if (found !== undefined) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Calculate the total number of blocks that have changed between
 * the given snapshots
 * @param  {String} currentSnap The snapshot currently being backed up
 * @param  {String} prevSnap    The last snapshot that was backeed up
 * @return {Integer}            The number of blocks that have changed between
 *                              the current snap and the last one
 */
exports.calcTotalChangedBlocks = async (currentSnap, prevSnap) => {
    var params = {
      SecondSnapshotId: currentSnap, /* required */
      FirstSnapshotId: prevSnap,
      MaxResults: '10000'
    };
    var totalChangedBlocks = 0;
    var nextToken = 'START';

    // Retrieve all changed blocks between the given snapshots. We'll use this
    // to return the total number of blocks changed
    while (nextToken !== null) {
      let blocks = await snapshotChangedBlocks(params);

      totalChangedBlocks += blocks.ChangedBlocks.length;
      nextToken = blocks.NextToken;

      console.log(`Total Changed Blocks...: ${totalChangedBlocks} | Next Token...: ${nextToken}`);
      params.NextToken = nextToken;
    }

    return totalChangedBlocks;
};

const AWS = require('aws-sdk');
const ebs = new AWS.EBS();

/**
 * Retrieve the next set of changed blocks when comparing the snapshots
 * given in the 'params'
 * @param  {Object}  params The snapshots to compare
 * @return {Promise} A promise to return an array of changed blocks
 */
async function snapshotChangedBlocks(params) {
  return await ebs.listChangedBlocks(params).promise();
}

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
      var blocks = await snapshotChangedBlocks(params);

      totalChangedBlocks += blocks.ChangedBlocks.length;
      nextToken = blocks.NextToken;

      console.log(`Total Changed Blocks...: ${totalChangedBlocks} | Next Token...: ${nextToken}`);
      params.NextToken = nextToken;
    }

    return totalChangedBlocks;
};

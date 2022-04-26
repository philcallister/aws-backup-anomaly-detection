const AWS = require('aws-sdk');
const TABLE = 'anomaly-detection';
const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Get an item from DynamoDB given an ARN
 * @param  {String} arn The ARN which was backed up
 * @return {Promise}    A promise to return The DynamoDB item {arn, snapshot}
 */
exports.getItem = async (arn) => {
  var params = {
    TableName: TABLE,
    Key: {
      arn: arn
    }
  };
  return await docClient.get(params).promise();
};

/**
 * Put an item into DynamoDB
 * @param  {String} arn  The ARN which was backed up
 * @param  {String} snap The snaphot which was backup up
 * @return {Promise}     A promise to add the item
 */
exports.putItem = async (arn, snap) => {
  var params = {
    TableName: TABLE,
    Item: {
      arn: arn,
      snapshot: snap
    }
  };
  await docClient.put(params).promise();
};

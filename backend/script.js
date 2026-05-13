const Minio = require('minio');
const client = new Minio.Client({
    endPoint: 'localhost',
    port: 9010,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin123'
});
const bucket = 'reimbursements';
const policy = {
    Version: '2012-10-17',
    Statement: [
        {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`]
        }
    ]
};
client.setBucketPolicy(bucket, JSON.stringify(policy), function(err) {
    if (err) throw err;
    console.log('Policy set!');
});

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

function getS3Client() {
  if (!client) {
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
      throw new Error('S3 credentials not configured');
    }
    client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { 
        accessKeyId: process.env.S3_ACCESS_KEY, 
        secretAccessKey: process.env.S3_SECRET_KEY 
      }
    });
  }
  return client;
}

export async function putObject(bucket: string, key: string, body: Buffer, contentType='application/octet-stream') {
  try {
    const s3Client = getS3Client();
    await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return `s3://${bucket}/${key}`;
  } catch (error: any) {
    console.error('S3 upload failed:', error.message);
    throw new Error('File upload failed');
  }
}
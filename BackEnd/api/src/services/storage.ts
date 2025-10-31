import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: { 
    accessKeyId: process.env.S3_ACCESS_KEY || '', 
    secretAccessKey: process.env.S3_SECRET_KEY || '' 
  }
});

export async function putObject(bucket: string, key: string, body: Buffer, contentType='application/octet-stream') {
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return `s3://${bucket}/${key}`;
  } catch (error) {
    throw new Error('Failed to upload file');
  }
}
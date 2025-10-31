import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let client: S3Client;
try {
  client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { 
      accessKeyId: process.env.S3_ACCESS_KEY || '', 
      secretAccessKey: process.env.S3_SECRET_KEY || '' 
    }
  });
} catch (error) {
  console.error('S3 client initialization failed:', error);
  throw new Error('Storage service unavailable');
}

export async function putObject(bucket: string, key: string, body: Buffer, contentType='application/octet-stream') {
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return `s3://${bucket}/${key}`;
  } catch (error) {
    console.error('File upload failed:', { bucket, key: key.substring(0, 20), error: error?.message });
    throw new Error('Failed to upload file');
  }
}
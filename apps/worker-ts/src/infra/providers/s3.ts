import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import type { Adapter, Fetch, S3Config } from "./model";
import { storageError } from "./stream";

export class S3Adapter implements Adapter {
  private client: S3Client;
  constructor(
    private config: S3Config,
    fetcher: Fetch,
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.access_key,
        secretAccessKey: config.secret_key,
        sessionToken: config.session_token,
      },
      maxAttempts: 1,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      requestHandler: new FetchHttpHandler({ customFetch: fetcher }),
    });
  }
  async upload(id: string, body: Uint8Array<ArrayBuffer>) {
    const key = this.config.prefix ? `${this.config.prefix}/${id}` : id;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentLength: body.byteLength,
        ContentType: "application/octet-stream",
      }),
    );
    return key;
  }
  async download(key: string) {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    if (!result.Body) throw storageError();
    return result.Body.transformToWebStream();
  }
  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }
}

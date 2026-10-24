// S3 适配：使用 AWS SDK 访问自定义对象存储端点

package providers

import (
	"context"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type s3Adapter struct {
	client *s3.Client
	config S3Config
}

// newS3 构造使用显式凭据和 path-style 的 S3 客户端，关闭自动重试及非必需校验
func newS3(c S3Config, client *http.Client) *s3Adapter {
	return &s3Adapter{config: c, client: s3.New(s3.Options{
		Region:                     c.Region,
		BaseEndpoint:               &c.Endpoint,
		UsePathStyle:               true,
		Credentials:                credentials.NewStaticCredentialsProvider(c.AccessKey, c.SecretKey, c.SessionToken),
		HTTPClient:                 client,
		RetryMaxAttempts:           1,
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired,
	})}
}

// upload 以明确字节数上传临时文件，返回带实例前缀的 S3 对象键
func (a *s3Adapter) upload(ctx context.Context, id string, body *os.File, size int64) (string, error) {
	key := strings.TrimPrefix(a.config.Prefix+"/"+id, "/")
	_, err := a.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        &a.config.Bucket,
		Key:           &key,
		Body:          body,
		ContentLength: &size,
		ContentType:   aws.String("application/octet-stream"),
	})
	return key, err
}

// download 读取指定对象并将流交由调用方关闭
func (a *s3Adapter) download(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := a.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &a.config.Bucket,
		Key:    &key,
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// delete 调用 S3 DeleteObject 删除指定对象
func (a *s3Adapter) delete(ctx context.Context, key string) error {
	_, err := a.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: &a.config.Bucket,
		Key:    &key,
	})
	return err
}

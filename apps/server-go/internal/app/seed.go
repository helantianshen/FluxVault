// 演示种子：建立本地 mock 文件和可排查的失败状态

package app

import (
	"context"
	"strings"
	"time"

	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/identity"
)

// seedFiles 通过业务服务建立正文，并显式构造 pending/deleting 演示元数据
func seedFiles(ctx context.Context, service *file.Service, repo file.Repository) error {
	for _, seed := range []struct{ name, instance, visibility, content string }{
		{"欢迎使用 FluxVault.txt", "s3-main", "public", "FluxVault mock environment. No cloud services are connected.\n"},
		{"版本说明.md", "gh-release", "public", "# FluxVault Mock\n\nGo 与 Worker 使用相同接口契约。\n"},
		{"归档清单.json", "tg-archive", "private", "{\"environment\":\"mock\",\"files\":[]}\n"},
		{"删除重试示例.txt", "s3-main", "private", "这是用于查看 deleting 状态的本地演示记录。\n"},
	} {
		f, err := service.Upload(ctx, identity.Principal{Admin: true}, file.UploadInput{
			Name: seed.name, InstanceID: seed.instance, Visibility: seed.visibility,
			ContentType: "text/plain", Body: strings.NewReader(seed.content),
		})
		if err != nil {
			return err
		}
		if seed.name == "删除重试示例.txt" {
			if _, err = repo.BeginDelete(ctx, f.ID); err != nil {
				return err
			}
			if err = repo.RecordFailure(ctx, f.ID, "storage_failure"); err != nil {
				return err
			}
		}
	}
	now := time.Now().UTC()
	return repo.CreateFile(ctx, file.File{
		ID: "mock-pending-upload", Name: "待确认上传示例.txt", ContentType: "text/plain",
		InstanceID: "s3-main", OwnerID: "system", Visibility: "private", State: "pending",
		LastError: "storage_failure", CreatedAt: now, UpdatedAt: now,
	})
}

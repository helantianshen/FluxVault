// GitHub 适配：管理 Release 资产及受限下载跳转

package providers

import (
	"context"
	"io"
	"net/http"
	"os"
	"strconv"

	"github.com/google/go-github/v93/github"
)

type githubAdapter struct {
	client *github.Client
	http   *http.Client
	config GitHubConfig
}

// newGitHub 构造仅向 GitHub API 提供 Token 的客户端，并复用受控 HTTP 传输
func newGitHub(c GitHubConfig, httpClient *http.Client) (*githubAdapter, error) {
	client, err := github.NewClient(github.WithAuthToken(c.Token), github.WithHTTPClient(httpClient))
	return &githubAdapter{client: client, http: httpClient, config: c}, err
}

// upload 上传已有 Release 的资产，并核验资产 ID、完成状态和字节数
func (a *githubAdapter) upload(ctx context.Context, id string, body *os.File, size int64) (string, error) {
	asset, _, err := a.client.Repositories.UploadReleaseAsset(ctx, a.config.Owner, a.config.Repo, a.config.ReleaseID, &github.UploadOptions{Name: id, MediaType: "application/octet-stream"}, body)
	if err != nil {
		return "", err
	}
	if asset.GetID() <= 0 || asset.GetState() != "uploaded" || int64(asset.GetSize()) != size {
		return "", storageError()
	}
	return strconv.FormatInt(asset.GetID(), 10), nil
}

// assetID 按十进制解析 64 位资产 ID，并限制在 JS 可精确表示的正整数范围
func assetID(key string) (int64, error) {
	// 以十进制解析有符号 64 位数，再约束到两端共用的安全整数范围
	id, err := strconv.ParseInt(key, 10, 64)
	if err != nil || id <= 0 || id > 9007199254740991 {
		return 0, storageError()
	}
	return id, nil
}

// download 支持 GitHub 直接流或受限 CDN 跳转，不向 CDN 转发仓库凭据
func (a *githubAdapter) download(ctx context.Context, key string) (io.ReadCloser, error) {
	id, err := assetID(key)
	if err != nil {
		return nil, err
	}
	body, location, err := a.client.Repositories.DownloadReleaseAsset(ctx, a.config.Owner, a.config.Repo, id, nil)
	if err != nil || body != nil {
		return body, err
	}
	if !githubDownloadURL(location) {
		return nil, storageError()
	}
	// CDN 请求不携带仓库凭据，定位信息只保留资产 ID
	return getBody(ctx, a.http, location)
}

// delete 删除资产，404 仅在确认资产缺失且 Release 可访问后视为幂等成功
func (a *githubAdapter) delete(ctx context.Context, key string) error {
	id, err := assetID(key)
	if err != nil {
		return err
	}
	res, err := a.client.Repositories.DeleteReleaseAsset(ctx, a.config.Owner, a.config.Repo, id)
	if err == nil || res == nil || res.StatusCode != http.StatusNotFound {
		return err
	}
	// 404 可能表示权限不足，只有确认资产不存在且发行可访问才视为已删除
	_, check, lookupErr := a.client.Repositories.GetReleaseAsset(ctx, a.config.Owner, a.config.Repo, id)
	if lookupErr == nil || check == nil || check.StatusCode != http.StatusNotFound {
		return err
	}
	_, _, releaseErr := a.client.Repositories.GetRelease(ctx, a.config.Owner, a.config.Repo, a.config.ReleaseID)
	return releaseErr
}

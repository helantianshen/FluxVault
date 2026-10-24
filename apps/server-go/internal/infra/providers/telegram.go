// Telegram 适配：通过 Bot API 存取文档并保留远端内容

package providers

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
)

type telegramAdapter struct {
	client *bot.Bot
	http   *http.Client
	config TelegramConfig
}

// newTelegram 构造不执行 getMe 或轮询的 Bot 客户端，内部错误只记录安全摘要
func newTelegram(c TelegramConfig, client *http.Client) (*telegramAdapter, error) {
	b, err := bot.New(
		c.BotToken,
		bot.WithSkipGetMe(),
		bot.WithHTTPClient(2*time.Minute, client),
		bot.WithErrorsHandler(func(error) { slog.Warn("Telegram SDK 内部处理失败") }),
	)
	return &telegramAdapter{client: b, http: client, config: c}, err
}

// upload 将文件作为静默文档发送到目标 chat，保存可用于取回的 file_id
func (a *telegramAdapter) upload(ctx context.Context, id string, body *os.File, _ int64) (string, error) {
	message, err := a.client.SendDocument(ctx, &bot.SendDocumentParams{
		ChatID: a.config.ChatID,
		Document: &models.InputFileUpload{
			Filename: id,
			Data:     body,
		},
		DisableContentTypeDetection: true,
		DisableNotification:         true,
	})
	if err != nil {
		return "", err
	}
	if message == nil || message.Document == nil || message.Document.FileID == "" {
		return "", storageError()
	}
	return message.Document.FileID, nil
}

// download 通过 getFile 重新取得安全相对路径，仅在服务端使用含 Token 的下载地址
func (a *telegramAdapter) download(ctx context.Context, key string) (io.ReadCloser, error) {
	f, err := a.client.GetFile(ctx, &bot.GetFileParams{FileID: key})
	if err != nil {
		return nil, err
	}
	if f == nil || f.FilePath == "" || path.IsAbs(f.FilePath) || path.Clean(f.FilePath) != f.FilePath || strings.ContainsAny(f.FilePath, "?%#\\\r\n") || strings.HasPrefix(f.FilePath, "..") {
		return nil, storageError()
	}
	// 每次下载重新取路径，带 Token 的 URL 只用于服务端请求
	return getBody(ctx, a.http, a.client.FileDownloadLink(f))
}

// delete 保持 Telegram 仅清理元数据的约定，不调用消息删除 API
func (*telegramAdapter) delete(context.Context, string) error { return nil }

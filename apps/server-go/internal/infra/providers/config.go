// 存储实例配置：严格解析 Secret 并校验各 Provider 的目标

// Package providers 封装 S3、GitHub 和 Telegram 真实存储 SDK
package providers

import (
	"encoding/json"
	"io"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"fluxvault/server-go/internal/modules/storage"
)

// S3Config 定义 S3 对象 API 目标、凭据和可选对象前缀
type S3Config struct {
	Endpoint     string `json:"endpoint"`
	Region       string `json:"region"`
	Bucket       string `json:"bucket"`
	AccessKey    string `json:"access_key"`
	SecretKey    string `json:"secret_key"`
	SessionToken string `json:"session_token,omitempty"`
	Prefix       string `json:"prefix,omitempty"`
}

// GitHubConfig 定义发行资产的目标仓库、发行 ID 和授权令牌
type GitHubConfig struct {
	Owner     string `json:"owner"`
	Repo      string `json:"repo"`
	ReleaseID int64  `json:"release_id"`
	Token     string `json:"token"`
}

// TelegramConfig 定义归档 Bot 和目标聊天
type TelegramConfig struct {
	BotToken string `json:"bot_token"`
	ChatID   string `json:"chat_id"`
}

var objectIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)
var repositoryPartPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$`)
var botTokenPattern = regexp.MustCompile(`^[1-9][0-9]*:[A-Za-z0-9_-]+$`)
var chatIDPattern = regexp.MustCompile(`^-?[1-9][0-9]*$`)
var prefixPattern = regexp.MustCompile(`^[A-Za-z0-9_/-]*$`)

// Validate 校验 S3 对象 API 根地址、静态凭据及 bucket 和对象前缀
func (c S3Config) Validate() error {
	endpoint, err := url.Parse(c.Endpoint)
	if err != nil {
		return storageError()
	}
	schemeInvalid := endpoint.Scheme != "https" && endpoint.Scheme != "http"
	addressInvalid := endpoint.Hostname() == "" || endpoint.User != nil
	suffixInvalid := endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/")
	credentialsMissing := c.AccessKey == "" || c.SecretKey == ""
	targetInvalid := strings.TrimSpace(c.Region) == "" || !repositoryPartPattern.MatchString(c.Bucket) || !prefixPattern.MatchString(c.Prefix)
	if schemeInvalid || addressInvalid || suffixInvalid || credentialsMissing || targetInvalid {
		return storageError()
	}
	return nil
}

// Validate 将发行 ID 限制在两端均可精确表示的正整数范围，要求明确仓库和 Token
func (c GitHubConfig) Validate() error {
	repositoryInvalid := !repositoryPartPattern.MatchString(c.Owner) || !repositoryPartPattern.MatchString(c.Repo)
	releaseInvalid := c.ReleaseID <= 0 || c.ReleaseID > 9007199254740991
	if repositoryInvalid || releaseInvalid || strings.TrimSpace(c.Token) == "" {
		return storageError()
	}
	return nil
}

// Validate 校验 Bot Token 和十进制 chat ID，允许群组使用负数 ID
func (c TelegramConfig) Validate() error {
	if !botTokenPattern.MatchString(c.BotToken) || !chatIDPattern.MatchString(c.ChatID) {
		return storageError()
	}
	return nil
}

// decodeConfig 拒绝超过 16 KiB、未知字段或多个 JSON 值的配置内容
func decodeConfig(raw string, out any) error {
	if len(raw) == 0 || len(raw) > 16384 {
		return storageError()
	}
	d := json.NewDecoder(strings.NewReader(raw))
	d.DisallowUnknownFields()
	if d.Decode(out) != nil || d.Decode(new(any)) != io.EOF {
		return storageError()
	}
	return nil
}

// resolve 解析实例引用的 Secret，校验对应配置后绑定真实适配器及目标身份
func (s *Store) resolve(i storage.Instance) (binding, error) {
	if s.secrets == nil || i.Validate() != nil {
		return binding{}, storageError()
	}
	raw, ok := s.secrets(i.SecretRef)
	if !ok {
		return binding{}, storageError()
	}
	switch i.Provider {
	case "s3":
		var c S3Config
		if decodeConfig(raw, &c) != nil {
			return binding{}, storageError()
		}
		if c.Validate() != nil {
			return binding{}, storageError()
		}
		c.Endpoint = strings.TrimSuffix(c.Endpoint, "/")
		c.Prefix = strings.Trim(c.Prefix, "/")
		return binding{adapter: newS3(c, s.http), target: c.Endpoint + "/" + c.Bucket + "/" + c.Prefix}, nil
	case "github":
		var c GitHubConfig
		if decodeConfig(raw, &c) != nil || c.Validate() != nil {
			return binding{}, storageError()
		}
		a, err := newGitHub(c, s.http)
		return binding{adapter: a, target: c.Owner + "/" + c.Repo + "/" + strconv.FormatInt(c.ReleaseID, 10)}, err
	case "telegram":
		var c TelegramConfig
		if decodeConfig(raw, &c) != nil || c.Validate() != nil {
			return binding{}, storageError()
		}
		botID, _, _ := strings.Cut(c.BotToken, ":")
		a, err := newTelegram(c, s.http)
		return binding{adapter: a, target: botID + "/" + c.ChatID}, err
	default:
		return binding{}, storageError()
	}
}

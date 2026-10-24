// D1 HTTP 传输：参数化查询、有限响应读取及安全错误转换

// Package d1 实现 Cloudflare D1 持久化仓储，不向业务层暴露 SQL 或访问令牌
package d1

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"time"

	"fluxvault/server-go/internal/fault"
	"fluxvault/server-go/internal/modules/auth"
	"fluxvault/server-go/internal/modules/file"
	"fluxvault/server-go/internal/modules/identity"
	"fluxvault/server-go/internal/modules/storage"
)

type client struct {
	endpoint, token string
	http            *http.Client
}
type statement struct {
	SQL    string `json:"sql"`
	Params []any  `json:"params"`
}
type result struct {
	Success bool            `json:"success"`
	Results json.RawMessage `json:"results"`
}

// NewRepositories 校验账户与数据库标识，使用同一客户端组装各模块仓储
func NewRepositories(account, database, token string) (file.Repository, storage.Repository, identity.Repository, auth.Repository, error) {
	if !regexp.MustCompile(`^[a-fA-F0-9]{32}$`).MatchString(account) || !regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`).MatchString(database) || token == "" {
		return nil, nil, nil, nil, failure()
	}
	c := &client{endpoint: "https://api.cloudflare.com/client/v4/accounts/" + account + "/d1/database/" + database + "/query", token: token, http: &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
	return &fileRepository{c}, &instanceRepository{c}, &keyRepository{c}, &adminRepository{c}, nil
}

func failure() error {
	return fault.New("metadata_failure", "数据库暂时不可用，请检查 D1 配置与迁移")
}

// execute 不重试写入；任何网络或 SQL 错误均只返回安全信息
func (c *client) execute(ctx context.Context, statements ...statement) ([]result, error) {
	for i := range statements {
		if statements[i].Params == nil {
			statements[i].Params = []any{}
		}
	}
	var payload any = statements[0]
	if len(statements) > 1 {
		payload = map[string]any{"batch": statements}
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, failure()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(raw))
	if err != nil {
		return nil, failure()
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	response, err := c.http.Do(req)
	if err != nil {
		return nil, failure()
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, failure()
	}
	raw, err = io.ReadAll(io.LimitReader(response.Body, (16<<20)+1))
	if err != nil || len(raw) > 16<<20 {
		return nil, failure()
	}
	var envelope struct {
		Success bool     `json:"success"`
		Result  []result `json:"result"`
	}
	if json.Unmarshal(raw, &envelope) != nil || !envelope.Success || len(envelope.Result) != len(statements) {
		return nil, failure()
	}
	for _, r := range envelope.Result {
		if !r.Success {
			return nil, failure()
		}
	}
	return envelope.Result, nil
}

func query[T any](ctx context.Context, c *client, sql string, params ...any) ([]T, error) {
	results, err := c.execute(ctx, statement{sql, params})
	if err != nil {
		return nil, err
	}
	return rows[T](results[0])
}
func rows[T any](r result) ([]T, error) {
	values := []T{}
	if json.Unmarshal(r.Results, &values) != nil {
		return nil, failure()
	}
	return values, nil
}
func timestamp(t time.Time) string { return t.UTC().Format("2006-01-02T15:04:05.000Z") }
func now() string                  { return timestamp(time.Now()) }

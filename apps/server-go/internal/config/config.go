// 启动配置：集中声明配置结构、读取规则及有效性校验

// Package config 加载并校验 Native 启动配置
package config

import (
	"net"
	"os"
	"strconv"
	"time"

	"github.com/spf13/viper"
)

const (
	keyMode          = "mode"           // 运行模式，mock 为演示，d1 为持久化
	keyPublicAddress = "public_address" // 公开 API 的监听 IP 和端口，mock 限回环
	keyAdminAddress  = "admin_address"  // 管理 API 的监听 IP 和独立端口，mock 限回环
	keyAdminUsername = "admin_username" // 管理员登录名
	keyAllowedOrigin = "allowed_origin" // 允许跨域访问管理台的来源
	keyJWTHours      = "jwt_hours"      // JWT 有效期，单位为小时，必须大于 0 且不超过 24
)

// Config 保存校验后的 Native 运行配置和进程认证材料
type Config struct {
	Mode          string
	PublicAddress string
	AdminAddress  string
	AdminUsername string
	AdminPassword string
	JWTSecret     string
	AllowedOrigin string
	JWTTTL        time.Duration
	D1AccountID   string
	D1DatabaseID  string
	D1APIToken    string
}

// Validate 校验监听 IP 与端口、凭据和有效期；仅 mock 限制回环地址
func (c Config) Validate() error {
	if c.Mode != "mock" && c.Mode != "d1" {
		return ErrUnsupportedMode
	}
	for _, address := range []string{
		c.PublicAddress,
		c.AdminAddress,
	} {
		host, port, err := net.SplitHostPort(address)
		ip := net.ParseIP(host)
		n, portErr := strconv.Atoi(port)
		if err != nil || ip == nil || portErr != nil || n < 1 || n > 65535 {
			return ErrListenAddress
		}
		if c.Mode == "mock" && !ip.IsLoopback() {
			return ErrLoopbackAddress
		}
	}
	passwordInvalid := (c.Mode == "mock" || c.AdminPassword != "") && (len(c.AdminPassword) < 12 || len(c.AdminPassword) > 72)
	secretInvalid := len(c.JWTSecret) < 32
	ttlInvalid := c.JWTTTL <= 0 || c.JWTTTL > 24*time.Hour
	addressesConflict := c.PublicAddress == c.AdminAddress
	if passwordInvalid || secretInvalid || ttlInvalid || addressesConflict || c.AdminUsername == "" || len(c.AdminUsername) > 120 {
		return ErrInvalidSettings
	}
	return nil
}

// Load 读取 YAML 与环境凭据，应用默认值后执行完整配置校验
func Load(path string) (Config, error) {
	v := viper.New()
	v.SetDefault(keyMode, "mock")
	v.SetDefault(keyPublicAddress, "127.0.0.1:18080")
	v.SetDefault(keyAdminAddress, "127.0.0.1:18081")
	v.SetDefault(keyAdminUsername, "admin")
	v.SetDefault(keyAllowedOrigin, "http://127.0.0.1:5173")
	v.SetDefault(keyJWTHours, 12)
	if path != "" {
		v.SetConfigFile(path)
		if err := v.ReadInConfig(); err != nil {
			return Config{}, err
		}
	}
	c := Config{
		Mode:          v.GetString(keyMode),
		PublicAddress: v.GetString(keyPublicAddress),
		AdminAddress:  v.GetString(keyAdminAddress),
		AdminUsername: v.GetString(keyAdminUsername),
		AdminPassword: credential(v, "admin_password", "FLUXVAULT_ADMIN_PASSWORD"),
		JWTSecret:     credential(v, "jwt_secret", "FLUXVAULT_JWT_SECRET"),
		D1AccountID:   v.GetString("d1.account_id"),
		D1DatabaseID:  v.GetString("d1.database_id"),
		D1APIToken:    credential(v, "d1.api_token", "CLOUDFLARE_API_TOKEN"),
		AllowedOrigin: v.GetString(keyAllowedOrigin),
		JWTTTL:        time.Duration(v.GetInt(keyJWTHours)) * time.Hour,
	}
	if c.Mode == "mock" {
		c.AdminPassword = os.Getenv("FLUXVAULT_MOCK_ADMIN_PASSWORD")
	}
	return c, c.Validate()
}

// 环境变量优先于本地私密配置，避免把凭据写进可提交示例
func credential(v *viper.Viper, key, env string) string {
	if value := os.Getenv(env); value != "" {
		return value
	}
	return v.GetString(key)
}

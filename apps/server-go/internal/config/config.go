// 启动配置：集中声明配置结构、读取规则及有效性校验

// Package config 加载并校验 Native 启动配置
package config

import (
	"net"
	"os"
	"time"

	"github.com/spf13/viper"
)

const (
	keyMode          = "mode"           // 运行模式，仅接受 mock
	keyPublicAddress = "public_address" // 公开 API 的回环 IP 和端口
	keyAdminAddress  = "admin_address"  // 管理 API 的回环 IP 和独立端口
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
}

// Validate 校验 mock 模式、回环监听、凭据长度、令牌有效期及独立端口
func (c Config) Validate() error {
	if c.Mode != "mock" {
		return ErrUnsupportedMode
	}
	for _, address := range []string{
		c.PublicAddress,
		c.AdminAddress,
	} {
		host, _, err := net.SplitHostPort(address)
		ip := net.ParseIP(host)
		if err != nil || ip == nil || !ip.IsLoopback() {
			return ErrLoopbackAddress
		}
	}
	passwordInvalid := len(c.AdminPassword) < 12 || len(c.AdminPassword) > 72
	secretInvalid := len(c.JWTSecret) < 32
	ttlInvalid := c.JWTTTL <= 0 || c.JWTTTL > 24*time.Hour
	addressesConflict := c.PublicAddress == c.AdminAddress
	if passwordInvalid || secretInvalid || ttlInvalid || addressesConflict {
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
		AdminPassword: os.Getenv("FLUXVAULT_MOCK_ADMIN_PASSWORD"),
		JWTSecret:     os.Getenv("FLUXVAULT_JWT_SECRET"),
		AllowedOrigin: v.GetString(keyAllowedOrigin),
		JWTTTL:        time.Duration(v.GetInt(keyJWTHours)) * time.Hour,
	}
	return c, c.Validate()
}

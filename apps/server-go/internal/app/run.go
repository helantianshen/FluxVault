// 应用生命周期：双监听器启动、信号退出和临时资源释放

package app

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fluxvault/server-go/internal/config"
	"fluxvault/server-go/internal/server"

	"github.com/gin-gonic/gin"
)

// Run 启动选定模式的服务，任一监听失败或收到信号时关闭所有已创建资源
func Run(c config.Config) error {
	gin.SetMode(gin.ReleaseMode)
	factory := Mock
	if c.Mode == "d1" {
		factory = Persistent
	}
	routes, cleanup, err := factory(c)
	if err != nil {
		return err
	}
	defer cleanup()
	// 两个监听器均创建成功后才开始服务，后续失败会关闭已创建监听器
	public, err := net.Listen("tcp", c.PublicAddress)
	if err != nil {
		return err
	}
	defer public.Close()
	admin, err := net.Listen("tcp", c.AdminAddress)
	if err != nil {
		return err
	}
	defer admin.Close()
	servers := server.NewServers(routes)

	// 退出信号和任一服务异常都会进入同一关闭流程
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	errs := make(chan error, 2)
	go func() {
		errs <- servers[0].Serve(public)
	}()
	go func() {
		errs <- servers[1].Serve(admin)
	}()
	slog.Info("FluxVault 已启动", "mode", c.Mode, "public", c.PublicAddress, "admin", c.AdminAddress)
	select {
	case <-ctx.Done():
	case err = <-errs:
	}
	// 给进行中的请求五秒退出时间，超时后强制关闭连接
	shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for _, s := range servers {
		if e := s.Shutdown(shutdown); e != nil {
			_ = s.Close()
		}
	}
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

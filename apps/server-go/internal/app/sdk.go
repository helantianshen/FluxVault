// SDK 组装入口：真实对象适配器的显式构造，默认运行仍使用 mock

package app

import (
	"os"

	"fluxvault/server-go/internal/infra/providers"
	"fluxvault/server-go/internal/modules/file"
)

// SDKObjects 构造从环境变量解析 Secret 的对象适配器，构造时不发送网络请求
func SDKObjects() file.ObjectStore { return providers.New(os.LookupEnv, nil) }

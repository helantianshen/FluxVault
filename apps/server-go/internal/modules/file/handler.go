// HTTP 协议层：文件接口的请求解析与流式响应

package file

import (
	"io"
	"mime"
	"net/http"
	"slices"
	"strconv"
	"time"

	"fluxvault/server-go/internal/httpx"
	"fluxvault/server-go/internal/middleware"
	"fluxvault/server-go/pkg/pagination"

	"github.com/gin-gonic/gin"
)

// Handler 将本模块 HTTP 请求适配为 Service 操作
type Handler struct{ service *Service }

// NewHandler 注入本模块业务服务，不向协议层暴露 Repository
func NewHandler(service *Service) *Handler { return &Handler{service: service} }

// FileDTO 是本模块列表、详情及写入响应共用的安全视图
type FileDTO struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	ContentType string    `json:"content_type"`
	Size        int64     `json:"size"`
	InstanceID  string    `json:"instance_id"`
	OwnerID     string    `json:"owner_id"`
	Visibility  string    `json:"visibility"`
	State       string    `json:"state"`
	LastError   string    `json:"last_error"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// fileDTO 映射文件安全视图，排除内部远端定位符
func fileDTO(f File) FileDTO {
	return FileDTO{
		ID:          f.ID,
		Name:        f.Name,
		ContentType: f.ContentType,
		Size:        f.Size,
		InstanceID:  f.InstanceID,
		OwnerID:     f.OwnerID,
		Visibility:  f.Visibility,
		State:       f.State,
		LastError:   f.LastError,
		CreatedAt:   f.CreatedAt,
		UpdatedAt:   f.UpdatedAt,
	}
}

type fileListResponse struct {
	Items  []FileDTO `json:"items"`
	Total  int       `json:"total"`
	Limit  int       `json:"limit"`
	Offset int       `json:"offset"`
}

// List 校验筛选条件并返回当前身份可见的文件分页
// GET /admin/v1/files
// GET /api/v1/files
func (h *Handler) List(c *gin.Context) {
	f, ok := filter(c)
	if !ok {
		return
	}
	result, err := h.service.List(c.Request.Context(), middleware.Principal(c), f)
	if err != nil {
		httpx.Error(c, err)
		return
	}
	items := make([]FileDTO, 0, len(result.Items))
	for _, f := range result.Items {
		items = append(items, fileDTO(f))
	}
	c.JSON(200, fileListResponse{Items: items, Total: result.Total, Limit: result.Limit, Offset: result.Offset})
}

// filter 读取文件筛选条件并校验十进制分页范围，返回协议层错误而非截断输入
func filter(c *gin.Context) (Filter, bool) {
	f := Filter{Query: c.Query("q"), State: c.Query("state"), Visibility: c.Query("visibility"), InstanceID: c.Query("instance_id"), Params: pagination.Default()}
	if !httpx.ValidQuery(c, "q", "state", "visibility", "instance_id", "limit", "offset") {
		return f, false
	}
	if len(f.Query) > 50 || !slices.Contains([]string{"", "pending", "ready", "deleting"}, f.State) || !slices.Contains([]string{"", "private", "public"}, f.Visibility) {
		httpx.Error(c, ErrFilter)
		return f, false
	}
	for key, target := range map[string]*int{"limit": &f.Limit, "offset": &f.Offset} {
		if value, ok := c.GetQuery(key); ok {
			n, err := strconv.Atoi(value)
			if err != nil {
				httpx.Error(c, ErrPagination)
				return f, false
			}
			*target = n
		}
	}
	if err := f.Params.Validate(); err != nil {
		httpx.Error(c, ErrPagination)
		return f, false
	}
	return f, true
}

// Get 返回当前身份有权查看的文件详情
// GET /admin/v1/files/:id
// GET /api/v1/files/:id
func (h *Handler) Get(c *gin.Context) {
	f, err := h.service.Get(c.Request.Context(), middleware.Principal(c), c.Param("id"))
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(200, fileDTO(f))
}

// Upload 将原始请求正文和上传元数据交给文件服务
// POST /admin/v1/files
// POST /api/v1/files
func (h *Handler) Upload(c *gin.Context) {
	if !httpx.ValidQuery(c, "name", "instance_id", "visibility") {
		return
	}
	contentType, _, err := mime.ParseMediaType(c.GetHeader("Content-Type"))
	if err != nil {
		httpx.Error(c, ErrContentType)
		return
	}
	f, err := h.service.Upload(c.Request.Context(), middleware.Principal(c), UploadInput{
		Name:        c.Query("name"),
		InstanceID:  c.Query("instance_id"),
		Visibility:  c.Query("visibility"),
		ContentType: contentType,
		Body:        c.Request.Body,
	})
	if err != nil {
		httpx.Error(c, err)
		return
	}
	c.JSON(201, fileDTO(f))
}

// Download 设置下载响应头并流式转发正文，结束后关闭上游流
// GET /admin/v1/files/:id/content
// GET /api/v1/files/:id/content
func (h *Handler) Download(c *gin.Context) {
	if !httpx.ValidQuery(c, "mode") {
		return
	}
	mode := c.DefaultQuery("mode", "auto")
	if !slices.Contains([]string{"auto", "direct", "proxy"}, mode) {
		httpx.Error(c, ErrDownloadMode)
		return
	}
	f, body, err := h.service.Download(c.Request.Context(), middleware.Principal(c), c.Param("id"), mode)
	if err != nil {
		httpx.Error(c, err)
		return
	}
	defer body.Close()
	c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.Name}))
	c.Header("Content-Security-Policy", "sandbox")
	c.Header("Content-Type", f.ContentType)
	c.Status(200)
	written, err := io.CopyBuffer(c.Writer, body, make([]byte, 32<<10))
	if err != nil || written != f.Size {
		// 响应可能已经发送，必须中断传输，不能追加 JSON 或正常结束残缺正文
		panic(http.ErrAbortHandler)
	}
}

// Delete 按当前身份删除文件，失败由业务服务保留恢复状态
// DELETE /admin/v1/files/:id
// DELETE /api/v1/files/:id
func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), middleware.Principal(c), c.Param("id")); err != nil {
		httpx.Error(c, err)
		return
	}
	c.Status(204)
}

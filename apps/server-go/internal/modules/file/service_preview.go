// 图片预览：有界读取正文并按 Worker 相同的文件签名识别格式，不解码或转码

package file

import (
	"bytes"
	"encoding/binary"
	"io"
	"regexp"

	"fluxvault/server-go/internal/fault"
)

const maxPreviewBytes = 8 << 20 // 预览输入最多 8 MiB

// 与 JavaScript 的空白集合一致，包含 BOM、Unicode 分隔符及垂直制表符
const svgWhitespace = `[\s\v\p{Zs}\x{2028}\x{2029}\x{feff}]`

var svgStart = regexp.MustCompile(`(?i)^` + svgWhitespace + `*(?:<\?xml[^>]*>` + svgWhitespace + `*)?(?:<!--(?s:.*?)-->` + svgWhitespace + `*)*<svg(?:` + svgWhitespace + `|>)`)

// Preview 返回原始字节及按文件头识别的 MIME；未知和不支持的格式返回安全的 422 类错误
func (*Service) Preview(body io.Reader) ([]byte, string, error) {
	data, err := io.ReadAll(io.LimitReader(body, maxPreviewBytes+1))
	if err != nil {
		return nil, "", err
	}
	if len(data) > maxPreviewBytes {
		return nil, "", ErrPreviewTooLarge
	}
	typeName := imageType(data)
	switch typeName {
	case "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp":
		return data, typeName, nil
	case "":
		return nil, "", ErrUnknownPreview
	default:
		return nil, "", fault.New("preview_unavailable", "实际格式："+typeName+"，暂不支持预览，请下载查看")
	}
}

func imageType(data []byte) string {
	switch {
	case bytes.HasPrefix(data, []byte{137, 80, 78, 71, 13, 10, 26, 10}):
		return "image/png"
	case bytes.HasPrefix(data, []byte{255, 216, 255}):
		return "image/jpeg"
	case bytes.HasPrefix(data, []byte("GIF87a")), bytes.HasPrefix(data, []byte("GIF89a")):
		return "image/gif"
	case len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP":
		return "image/webp"
	case bytes.HasPrefix(data, []byte("BM")):
		return "image/bmp"
	case bytes.HasPrefix(data, []byte{73, 73, 42, 0}), bytes.HasPrefix(data, []byte{77, 77, 0, 42}):
		return "image/tiff"
	case bytes.HasPrefix(data, []byte{0, 0, 1, 0}):
		return "image/x-icon"
	case bytes.HasPrefix(data, []byte("%PDF-")):
		return "application/pdf"
	case bytes.HasPrefix(data, []byte{80, 75, 3, 4}), bytes.HasPrefix(data, []byte{80, 75, 5, 6}):
		return "application/zip"
	}
	if svgStart.Match(data[:min(len(data), 4096)]) {
		return "image/svg+xml"
	}
	if len(data) < 8 || string(data[4:8]) != "ftyp" {
		return ""
	}
	size := binary.BigEndian.Uint32(data[:4])
	if size < 16 || size > uint32(len(data)) || size > 256 {
		return ""
	}
	brands := []string{string(data[8:12])}
	for offset := 16; offset+4 <= int(size); offset += 4 {
		brands = append(brands, string(data[offset:offset+4]))
	}
	for _, group := range []struct {
		brands []string
		mime   string
	}{
		{[]string{"avif", "avis"}, "image/avif"},
		{[]string{"heic", "heix", "hevc", "hevx"}, "image/heic"},
		{[]string{"mif1", "msf1"}, "image/heif"},
	} {
		for _, brand := range brands {
			for _, accepted := range group.brands {
				if brand == accepted {
					return group.mime
				}
			}
		}
	}
	return ""
}

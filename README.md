# Read Image MCP Server

MCP (Model Context Protocol) server dùng **Google Gemini** để đọc và mô tả nội dung ảnh. Hỗ trợ cả ảnh đơn và nhiều ảnh cùng lúc (so sánh, đối chiếu).

## 🚀 Tính năng

- 📷 **Đọc ảnh đơn** — Gửi 1 ảnh và nhận mô tả chi tiết bằng tiếng Việt
- 🖼️ **Đọc nhiều ảnh** — Gửi nhiều ảnh trong 1 lần gọi để so sánh, đối chiếu
- 📝 **Prompt tùy chỉnh** — Đặt câu hỏi cụ thể về ảnh (không bắt buộc)
- 🎨 **Hỗ trợ nhiều định dạng** — PNG, JPEG, GIF, WebP, BMP, SVG, TIFF, ICO, AVIF
- ⚡ **Tích hợp MCP** — Dùng được ngay trong Claude Code, VS Code, JetBrains...

## 📋 Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- [Google AI Studio API Key](https://aistudio.google.com/apikey) (miễn phí)
- Claude Code hoặc MCP client khác

## 🔧 Cài đặt

### 1. Clone repo

```bash
git clone https://github.com/hovie/read-image-mcp.git
cd read-image-mcp
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

## ⚙️ Cấu hình

### Lấy Gemini API Key (miễn phí)

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey)
2. Đăng nhập bằng tài khoản Google
3. Nhấn **"Create API Key"** để tạo key mới
4. Copy key vừa tạo

### Cấu hình MCP Server

Có 2 cách cấu hình:

#### Cách 1: Dùng file `.mcp.json` (khuyên dùng cho Claude Code)

Copy file mẫu và sửa API key:

```bash
copy .mcp.json.example .mcp.json
```

Sau đó mở `.mcp.json` và thay `YOUR_GEMINI_API_KEY_HERE` bằng API key thật của bạn:

```json
{
  "mcpServers": {
    "read-image": {
      "command": "npx",
      "args": ["tsx", "d:\\MCP\\read-image\\src\\index.ts"],
      "env": {
        "GEMINI_API_KEY": "AIzaSy...your-key-here",
        "GEMINI_MODEL": "gemini-2.5-flash"
      }
    }
  }
}
```

#### Cách 2: Dùng file `.env`

```bash
copy .env.example .env
```

Sửa `.env` với API key của bạn:

```env
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

### Chọn Model

| Model | Mô tả | Dùng khi |
|-------|-------|----------|
| `gemini-2.5-flash` | Nhanh, miễn phí | Hầu hết trường hợp |
| `gemini-2.5-pro` | Mạnh hơn, có trả phí | Ảnh phức tạp, cần phân tích sâu |

Sửa biến `GEMINI_MODEL` trong `.env` hoặc `.mcp.json` để đổi model.

## 🏃 Cách chạy

### Chạy dev (không cần build)

```bash
npm run dev
```

### Chạy production (sau khi build)

```bash
npm run build
npm start
```

### Dùng trong Claude Code

Sau khi cấu hình `.mcp.json`, Claude Code sẽ tự động nhận MCP server. Bạn có thể gọi tool `read_image` từ Claude Code để đọc ảnh.

Tool sẽ xuất hiện với tên **`read_image`** với các tham số:

| Tham số | Loại | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `image_path` | string | Không* | Đường dẫn đến 1 file ảnh |
| `image_paths` | string[] | Không* | Đường dẫn đến nhiều file ảnh |
| `prompt` | string | Không | Câu hỏi / yêu cầu về ảnh |

> *Phải có ít nhất 1 trong 2: `image_path` hoặc `image_paths`

## 📖 Ví dụ

### Đọc 1 ảnh

```
Dùng read_image đọc ảnh D:\photos\cat.png
```

### Đọc nhiều ảnh để so sánh

```
Dùng read_image đọc 2 ảnh D:\photos\before.png và D:\photos\after.png,
so sánh sự khác biệt giữa 2 ảnh
```

### Hỏi câu hỏi cụ thể về ảnh

```
Dùng read_image đọc ảnh D:\screenshots\dashboard.png,
cho biết có những số liệu gì trên dashboard này?
```

## 📁 Cấu trúc project

```
read-image-mcp/
├── src/
│   └── index.ts          # MCP server chính
├── dist/                  # Build output (sau khi chạy npm run build)
├── .env.example           # Mẫu file biến môi trường
├── .mcp.json.example      # Mẫu cấu hình MCP cho Claude Code
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Bảo mật

- **KHÔNG** commit file `.env` hoặc `.mcp.json` chứa API key thật
- File `.env` và `.mcp.json` đã được thêm vào `.gitignore`
- Dùng file `.example` làm mẫu cho người khác
- Nếu lỡ commit API key, xóa ngay trên [Google AI Studio](https://aistudio.google.com/apikey) và tạo key mới

## 🛠️ Tech Stack

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) — Giao thức MCP
- [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) — Gemini API
- [TypeScript](https://www.typescriptlang.org/) + [tsx](https://github.com/privatenumber/tsx) — Runtime

## 📄 License

MIT

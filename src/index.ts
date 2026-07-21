import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

// ── Config ──────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ── MIME type detection ─────────────────────────────────────────────
const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "image/png";
}

// ── Gemini client ───────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function readImageAsBase64(imagePath: string): { data: string; mimeType: string } {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString("base64");
  const mimeType = getMimeType(imagePath);
  return { data: base64Data, mimeType };
}

async function describeImages(
  imagePaths: string[],
  prompt?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const defaultPrompt =
    imagePaths.length === 1
      ? "Hãy mô tả chi tiết bức ảnh này bằng tiếng Việt. " +
        "Mô tả mọi thứ bạn thấy: đối tượng, màu sắc, văn bản (nếu có), " +
        "bố cục, bối cảnh, và bất kỳ chi tiết quan trọng nào khác."
      : `Hãy mô tả chi tiết ${imagePaths.length} bức ảnh này bằng tiếng Việt. ` +
        "Với mỗi ảnh, hãy đánh số thứ tự rõ ràng (Ảnh 1, Ảnh 2, ...) " +
        "và mô tả: đối tượng, màu sắc, văn bản (nếu có), bố cục, bối cảnh. " +
        "Sau đó, nếu có liên quan, hãy so sánh hoặc chỉ ra mối liên hệ giữa các ảnh.";

  const userPrompt = prompt || defaultPrompt;

  // Build content parts: text prompt + all images
  const parts: any[] = [{ text: userPrompt }];
  for (const imagePath of imagePaths) {
    const { data, mimeType } = readImageAsBase64(imagePath);
    parts.push({ inlineData: { mimeType, data } });
  }

  const result = await model.generateContent(parts);
  return result.response.text();
}

// ── MCP Server ──────────────────────────────────────────────────────
const server = new Server(
  {
    name: "read-image",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Tool: read_image ────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read_image",
      description:
        "Đọc và mô tả nội dung ảnh bằng Gemini. " +
        "Hỗ trợ cả ảnh đơn (image_path) và nhiều ảnh cùng lúc (image_paths). " +
        "Dùng image_paths khi cần phân tích, so sánh nhiều ảnh trong 1 lần gọi.",
      inputSchema: {
        type: "object" as const,
        properties: {
          image_path: {
            type: "string",
            description:
              "Đường dẫn tuyệt đối đến MỘT file ảnh cần phân tích. " +
              "Dùng cái này nếu chỉ có 1 ảnh. Không dùng chung với image_paths.",
          },
          image_paths: {
            type: "array",
            items: { type: "string" },
            description:
              "Danh sách đường dẫn tuyệt đối đến NHIỀU file ảnh. " +
              "Dùng cái này khi cần đọc nhiều ảnh cùng lúc (so sánh, đối chiếu...). " +
              "Tất cả ảnh sẽ được gửi trong 1 lần gọi API. Không dùng chung với image_path.",
          },
          prompt: {
            type: "string",
            description:
              "Câu hỏi hoặc yêu cầu cụ thể về ảnh (không bắt buộc). " +
              "Nếu không có, Gemini sẽ tự động mô tả toàn bộ nội dung.",
          },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "read_image") {
    const imagePath = (args as any)?.image_path as string | undefined;
    const imagePaths = (args as any)?.image_paths as string[] | undefined;
    const prompt = (args as any)?.prompt as string | undefined;

    // Determine the list of images to process
    let paths: string[] = [];
    if (imagePaths && imagePaths.length > 0) {
      paths = imagePaths;
    } else if (imagePath) {
      paths = [imagePath];
    } else {
      return {
        content: [
          {
            type: "text" as const,
            text:
              "❌ Thiếu tham số. Vui lòng cung cấp `image_path` (cho 1 ảnh) " +
              "hoặc `image_paths` (cho nhiều ảnh).",
          },
        ],
        isError: true,
      };
    }

    // Validate all files exist
    const missingFiles = paths.filter((p) => !fs.existsSync(p));
    if (missingFiles.length > 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Không tìm thấy ${missingFiles.length} file:\n${missingFiles.map((f) => `  - "${f}"`).join("\n")}\nKiểm tra lại đường dẫn.`,
          },
        ],
        isError: true,
      };
    }

    try {
      const description = await describeImages(paths, prompt);
      return {
        content: [{ type: "text" as const, text: description }],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Lỗi khi gọi Gemini API: ${error.message || error}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `❌ Unknown tool: "${name}". MCP này chỉ hỗ trợ tool "read_image".`,
      },
    ],
    isError: true,
  };
});

// ── Start ───────────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_API_KEY) {
    console.error(
      "❌ GEMINI_API_KEY chưa được cấu hình.\n" +
        "   Tạo file .env với nội dung:\n" +
        "   GEMINI_API_KEY=your-key-here\n" +
        "   Hoặc set environment variable GEMINI_API_KEY."
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ read-image MCP server đã sẵn sàng (model:", GEMINI_MODEL, ")");
}

main().catch((err) => {
  console.error("❌ Server crashed:", err);
  process.exit(1);
});

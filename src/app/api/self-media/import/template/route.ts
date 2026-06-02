import { getSelfMediaImportTemplate } from "@/domain/self-media/runtime";

const presets = ["generic", "douyin", "xiaohongshu", "wechat", "video_account", "bilibili"] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("preset");
  const preset = presets.find((item) => item === requested) ?? "generic";
  const csv = await getSelfMediaImportTemplate(preset);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=self-media-${preset}-template.csv`
    }
  });
}

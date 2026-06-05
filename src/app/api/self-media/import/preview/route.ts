import { previewSelfMediaImport } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      type CsvFilePreviewRequest = Parameters<typeof previewSelfMediaImport>[0] & { fileName: string; contentType: string; fileBase64: string };
      const form = await request.formData();
      const file = form.get("file");
      const preset = String(form.get("preset") ?? "generic");
      if (!(file instanceof File)) throw new Error("导入预览需要上传文件。");
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await previewSelfMediaImport({
        mode: "csv",
        preset: preset as CsvFilePreviewRequest["preset"],
        fileName: file.name,
        contentType: file.type,
        fileBase64: buffer.toString("base64")
      } as CsvFilePreviewRequest);
      return Response.json(result);
    }
    const body = await request.json();
    const result = await previewSelfMediaImport(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "导入预览失败" }, { status: 400 });
  }
}

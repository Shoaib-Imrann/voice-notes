import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("X-API-Key-ID");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing X-API-Key-ID header" }, { status: 400 });
    }

    const formData = await req.formData();

    const response = await fetch("https://api.vachana.ai/stt/v3", {
      method: "POST",
      headers: {
        "X-API-Key-ID": apiKey,
      },
      body: formData,
    });

    const resText = await response.text();
    let data: Record<string, unknown> | { text: string };
    try {
      data = JSON.parse(resText);
    } catch {
      data = { text: resText };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to proxy request to Gnani STT" },
      { status: 500 },
    );
  }
}

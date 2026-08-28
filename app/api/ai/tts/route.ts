import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";

/**
 * Clean & normalize text for Malayalam and English speech synthesis
 */
function prepareTextForTTS(text: string): { text: string; lang: "ml" | "en" } {
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);

  let cleaned = text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/^###\s+/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/^#\s+/gm, "")
    .replace(/^[\*\-]\s+/gm, "") // bullets
    .replace(/•/g, "")
    .replace(/`/g, "")
    .replace(/[\(\)\[\]\{\}]/g, " ") // brackets
    .replace(/[:;]/g, ",")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (hasMalayalam) {
    // Format currency and symbols for Malayalam neural voice
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+(\.[0-9]+)?)\s*(രൂപ)?/g, "$1 രൂപ")
      .replace(/₹/g, "രൂപ ")
      .replace(/(\d+)\s*%/g, "$1 ശതമാനം")
      .replace(/(\d+)\s*(nos|units|items)/gi, "$1 എണ്ണം")
      .trim();
    return { text: cleaned, lang: "ml" };
  } else {
    cleaned = cleaned
      .replace(/₹\s*([0-9,]+(\.[0-9]+)?)/g, "Rupees $1")
      .replace(/₹/g, "Rupees ")
      .replace(/(\d+)\s*%/g, "$1 percent")
      .trim();
    return { text: cleaned, lang: "en" };
  }
}

/**
 * Split text into small natural sentences/phrases (max ~180 characters per chunk)
 */
function chunkText(text: string, maxLength = 180): string[] {
  if (text.length <= maxLength) return [text];

  const sentences = text.split(/(?<=[.!?,\n])/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + " " + trimmed).trim().length <= maxLength) {
      currentChunk = (currentChunk + " " + trimmed).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);

      if (trimmed.length <= maxLength) {
        currentChunk = trimmed;
      } else {
        // Split by words
        const words = trimmed.split(" ");
        currentChunk = "";
        for (const word of words) {
          if ((currentChunk + " " + word).trim().length <= maxLength) {
            currentChunk = (currentChunk + " " + word).trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = word;
          }
        }
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter((c) => c.trim().length > 0);
}

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rawText = body.text;

    if (!rawText || typeof rawText !== "string") {
      return NextResponse.json({ success: false, message: "Invalid text" }, { status: 400 });
    }

    const { text: cleanText, lang } = prepareTextForTTS(rawText);
    const chunks = chunkText(cleanText);

    if (chunks.length === 0) {
      return NextResponse.json({ success: false, message: "Empty text" }, { status: 400 });
    }

    // Fetch neural MP3 audio streams for each chunk in parallel
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        console.warn(`TTS fetch failed for chunk with status ${response.status}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ success: false, message: "Failed to generate audio" }, { status: 500 });
    }

    // Concatenate all MP3 buffers
    const combinedBuffer = Buffer.concat(audioBuffers);

    return new Response(combinedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": combinedBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("TTS API error:", error);
    return NextResponse.json({ success: false, message: error?.message || "TTS error" }, { status: 500 });
  }
}

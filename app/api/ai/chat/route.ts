import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { processAIChatMessage } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const user = verifyRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in to consult the AI assistant." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, history } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid query message." },
        { status: 400 }
      );
    }

    // Protection: Limit query length
    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, message: "Message is too long. Please keep questions under 2000 characters." },
        { status: 400 }
      );
    }

    // Process chat with ERP tools and Gemini
    const result = await processAIChatMessage({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      user,
    });

    return NextResponse.json({
      success: true,
      response: result.response,
      toolsUsed: result.toolsUsed,
    });
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "I'm unable to process your ERP business query right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}

import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from "@google/generative-ai";
import OpenAI from "openai";
import { executeTool } from "./tools";
import { ERP_SYSTEM_PROMPT } from "./system-prompt";
import { AuthUser } from "@/lib/auth";

export const geminiToolDeclarations: FunctionDeclaration[] = [
  {
    name: "getDashboardSummary",
    description: "Get key high-level ERP dashboard metrics (revenue, order counts, customer count, product count, low stock count) for a specified period (e.g. today, week, month, year).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          description: "Time period filter: 'today', 'this_week', 'this_month', 'last_month', 'this_year'. Defaults to 'this_month'.",
        },
      },
    },
  },
  {
    name: "getSalesSummary",
    description: "Get comprehensive sales statistics, total revenue, average order value, total units sold, and optional growth comparison with previous period.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          description: "Period: 'today', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year'.",
        },
        compareWithPrevious: {
          type: SchemaType.BOOLEAN,
          description: "Set to true to calculate percentage growth/decline compared to the preceding period of the same length.",
        },
      },
    },
  },
  {
    name: "getTopProducts",
    description: "Retrieve best-selling products ranked by units sold and generated revenue for a given period.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Number of top products to return (default 5, maximum 20).",
        },
        period: {
          type: SchemaType.STRING,
          description: "Time period filter: 'today', 'this_week', 'this_month', 'last_month', 'this_year', or 'all_time'.",
        },
      },
    },
  },
  {
    name: "getLowStockProducts",
    description: "Get products whose current stock is at or below their configured minimum threshold, including out-of-stock items and calculated stock shortage.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of items to return (default 15).",
        },
      },
    },
  },
  {
    name: "getRecentOrders",
    description: "Fetch the most recent customer sales orders with customer details, order amounts, fulfillment statuses, and invoice information.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Number of orders to retrieve (default 5, max 20).",
        },
        status: {
          type: SchemaType.STRING,
          description: "Optional filter by order status: 'PENDING', 'COMPLETED', 'CANCELLED'.",
        },
      },
    },
  },
  {
    name: "getCustomerInsights",
    description: "Retrieve customer intelligence such as top spenders, highest purchasing frequency, or inactive customers who haven't ordered in the last 60 days.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          description: "Type of customer insight: 'top_spending' or 'inactive'.",
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Maximum number of customers to list (default 5).",
        },
      },
    },
  },
  {
    name: "getSupplierInsights",
    description: "Retrieve supplier analytics and procurement spend rankings. Note: Restricted to ADMIN and MANAGER roles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: "Max number of suppliers to return (default 5).",
        },
      },
    },
  },
  {
    name: "getInvoiceSummary",
    description: "Get financial billing metrics including total invoiced, paid, unpaid, and total outstanding receivables. Note: Restricted to ADMIN and MANAGER roles.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "getInventoryInsights",
    description: "Get complete inventory health overview including total units, estimated cost & retail valuations, stock alert counts, and recent audit movements.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

// OpenAI formatted tool definitions
const openAIToolDeclarations: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getDashboardSummary",
      description: "Get key high-level ERP dashboard metrics (revenue, order counts, customer count, product count, low stock count).",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Time period filter: 'today', 'this_week', 'this_month', 'last_month', 'this_year'.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSalesSummary",
      description: "Get comprehensive sales statistics, total revenue, average order value, total units sold, and optional growth comparison with previous period.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            description: "Period: 'today', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year'.",
          },
          compareWithPrevious: {
            type: "boolean",
            description: "Set to true to calculate percentage growth/decline compared to the preceding period.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTopProducts",
      description: "Retrieve best-selling products ranked by units sold and generated revenue for a given period.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of top products to return (default 5)." },
          period: { type: "string", description: "Period filter: 'today', 'this_month', 'last_month', 'this_year', or 'all_time'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLowStockProducts",
      description: "Get products whose current stock is at or below minimum threshold.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max number of items to return." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRecentOrders",
      description: "Fetch recent customer sales orders with fulfillment and invoice status.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of orders to retrieve (default 5)." },
          status: { type: "string", description: "Optional filter: 'PENDING', 'COMPLETED', 'CANCELLED'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCustomerInsights",
      description: "Retrieve customer intelligence such as top spenders or inactive customers (60+ days).",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["top_spending", "inactive"], description: "Type of insight." },
          limit: { type: "number", description: "Max customers to list." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSupplierInsights",
      description: "Retrieve supplier analytics and procurement spend rankings. Note: Restricted to ADMIN and MANAGER roles.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max suppliers to return." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getInvoiceSummary",
      description: "Get financial billing metrics including total invoiced, paid, unpaid, and outstanding receivables. Note: Restricted to ADMIN and MANAGER roles.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getInventoryInsights",
      description: "Get complete inventory health overview including total units, estimated cost & retail valuations, and stock alerts.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Executes request via Google Gemini with Function Calling.
 */
async function processWithGemini(
  apiKey: string,
  params: { message: string; history?: ChatHistoryMessage[]; user: AuthUser }
): Promise<{ response: string; toolsUsed: string[] }> {
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: ERP_SYSTEM_PROMPT,
    tools: [{ functionDeclarations: geminiToolDeclarations }],
  });

  const toolsUsed: string[] = [];

  const pastTurns = (params.history || []).slice(-8).map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));

  const chat = model.startChat({
    history: pastTurns,
  });

  let response = await chat.sendMessage(params.message);
  let functionCalls = response.response.functionCalls();

  let loopCount = 0;
  while (functionCalls && functionCalls.length > 0 && loopCount < 5) {
    loopCount++;
    const functionResponses = [];

    for (const call of functionCalls) {
      if (!toolsUsed.includes(call.name)) {
        toolsUsed.push(call.name);
      }
      const toolResult = await executeTool(call.name, call.args, { user: params.user });
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    response = await chat.sendMessage(functionResponses);
    functionCalls = response.response.functionCalls();
  }

  const finalAnswer = response.response.text();
  return {
    response: finalAnswer || "I couldn't find enough data in the ERP to answer that accurately.",
    toolsUsed,
  };
}

/**
 * Executes request via OpenAI (GPT-4o-mini) as seamless fallback.
 */
async function processWithOpenAI(
  apiKey: string,
  params: { message: string; history?: ChatHistoryMessage[]; user: AuthUser }
): Promise<{ response: string; toolsUsed: string[] }> {
  const openai = new OpenAI({ apiKey });
  const toolsUsed: string[] = [];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: ERP_SYSTEM_PROMPT },
    ...(params.history || []).slice(-8).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: params.message },
  ];

  let loopCount = 0;
  while (loopCount < 5) {
    loopCount++;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: openAIToolDeclarations,
      tool_choice: "auto",
    });

    const responseMsg = completion.choices[0]?.message;
    if (!responseMsg) break;

    messages.push(responseMsg);

    if (responseMsg.tool_calls && responseMsg.tool_calls.length > 0) {
      for (const tc of responseMsg.tool_calls) {
        if (tc.type === "function") {
          const fnName = tc.function.name;
          if (!toolsUsed.includes(fnName)) toolsUsed.push(fnName);
          let fnArgs = {};
          try {
            fnArgs = JSON.parse(tc.function.arguments || "{}");
          } catch {}

          const result = await executeTool(fnName, fnArgs, { user: params.user });
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
      }
    } else {
      return {
        response: responseMsg.content || "I couldn't find enough data in the ERP to answer that accurately.",
        toolsUsed,
      };
    }
  }

  return {
    response: "Query processing complete.",
    toolsUsed,
  };
}

/**
 * Main AI Dispatcher with Automatic Fallback & Failover:
 * 1. Tries Gemini (Fast + Best Malayalam).
 * 2. If Gemini is rate-limited (429) or fails, shifts seamlessly to OpenAI.
 * 3. If only OpenAI key is configured, uses OpenAI directly.
 */
export async function processAIChatMessage(params: {
  message: string;
  history?: ChatHistoryMessage[];
  user: AuthUser;
}): Promise<{ response: string; toolsUsed: string[] }> {
  const geminiKey =
    process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your-gemini-api-key")
      ? process.env.GEMINI_API_KEY.trim()
      : "";

  const openAIKey =
    process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("your-openai-api-key")
      ? process.env.OPENAI_API_KEY.trim()
      : "";

  if (!geminiKey && !openAIKey) {
    return {
      response:
        "⚠️ **AI Assistant Key Missing**: Please add your `GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env` to enable live responses.",
      toolsUsed: [],
    };
  }

  // 1. Try Gemini first if key is present
  if (geminiKey) {
    try {
      return await processWithGemini(geminiKey, params);
    } catch (geminiError: any) {
      console.warn("Gemini execution encountered an error, attempting fallback to OpenAI:", geminiError?.message || geminiError);

      // If OpenAI is available, failover immediately
      if (openAIKey) {
        try {
          return await processWithOpenAI(openAIKey, params);
        } catch (openAIError: any) {
          console.error("OpenAI fallback also failed:", openAIError);
        }
      }

      // If no OpenAI fallback or if OpenAI also failed, return graceful message
      if (geminiError?.status === 429 || String(geminiError).includes("429") || String(geminiError).includes("ResourceExhausted")) {
        return {
          response: "⚠️ **Rate Limit Reached**: Gemini request quota exceeded. Please add an `OPENAI_API_KEY` to `.env` as an automatic backup or try again in a minute.",
          toolsUsed: [],
        };
      }

      return {
        response: `I'm unable to process this request right now (${geminiError?.message || "AI service error"}). Please try again.`,
        toolsUsed: [],
      };
    }
  }

  // 2. Direct OpenAI if only OpenAI is configured
  if (openAIKey) {
    try {
      return await processWithOpenAI(openAIKey, params);
    } catch (err: any) {
      console.error("OpenAI execution error:", err);
      return {
        response: `OpenAI error: ${err?.message || "Something went wrong"}.`,
        toolsUsed: [],
      };
    }
  }

  return {
    response: "No active AI provider configured.",
    toolsUsed: [],
  };
}

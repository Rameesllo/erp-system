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
  {
    name: "searchEntity",
    description: "Fuzzy search for specific products, customers, or suppliers by keyword/name to answer specific entity inquiries.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Search keyword or name (e.g. 'wireless mouse', 'iphone', 'john').",
        },
        entityType: {
          type: SchemaType.STRING,
          description: "Optional filter: 'product', 'customer', 'supplier', or 'all'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "navigateToPage",
    description: "Navigate the user's screen directly to an ERP page/screen (e.g. 'profile', 'inventory', 'products', 'categories', 'stock_movements', 'sales', 'customers', 'suppliers', 'invoices', 'payments', 'users', 'dashboard'). Call this whenever the user asks to open, go to, view, or show a page or screen.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        target: {
          type: SchemaType.STRING,
          description: "The destination screen name (e.g. 'profile', 'inventory', 'products', 'categories', 'sales', 'customers', 'suppliers', 'invoices', 'payments', 'users', 'dashboard').",
        },
      },
      required: ["target"],
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
  {
    type: "function",
    function: {
      name: "searchEntity",
      description: "Fuzzy search for specific products, customers, or suppliers by keyword or name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword or name." },
          entityType: { type: "string", enum: ["product", "customer", "supplier", "all"], description: "Entity type." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigateToPage",
      description: "Navigate the user's screen directly to an ERP page/screen (e.g. 'profile', 'inventory', 'products', 'categories', 'stock_movements', 'sales', 'customers', 'suppliers', 'invoices', 'payments', 'users', 'dashboard'). Call this whenever the user asks to open, go to, view, or show a page or screen.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "Destination page name (e.g. 'profile', 'inventory', 'products', 'categories', 'sales', 'customers', 'suppliers', 'invoices', 'payments', 'users', 'dashboard')." },
        },
        required: ["target"],
      },
    },
  },
];

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// Real Gemini model names — ordered newest → oldest as fallback chain
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

/** Returns true when the error is a quota / rate-limit signal */
function isRateLimitError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status ?? err?.statusCode ?? err?.code;
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("resourceexhausted") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit")
  );
}

export interface AssistantAction {
  type: "NAVIGATE";
  path: string;
  pageTitle: string;
  description?: string;
}

/**
 * Executes request via Google Gemini with Function Calling and fallback models.
 */
async function processWithGemini(
  apiKey: string,
  params: { message: string; history?: ChatHistoryMessage[]; user: AuthUser }
): Promise<{ response: string; toolsUsed: string[]; action?: AssistantAction }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const toolsUsed: string[] = [];
  let detectedAction: AssistantAction | undefined;

  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: ERP_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: geminiToolDeclarations }],
      });

      const contents: any[] = [
        ...(params.history || []).slice(-8).map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
        { role: "user", parts: [{ text: params.message }] },
      ];

      let loopCount = 0;
      while (loopCount < 5) {
        loopCount++;
        const result = await model.generateContent({ contents });
        const response = result.response;
        const candidates = response.candidates;
        const candidate = candidates?.[0];
        const functionCalls = response.functionCalls();

        if (!functionCalls || functionCalls.length === 0) {
          return {
            response: response.text() || "I couldn't find enough data in the ERP to answer that accurately.",
            toolsUsed,
            action: detectedAction,
          };
        }

        // Append model response with functionCalls to conversation contents
        if (candidate?.content) {
          contents.push(candidate.content);
        }

        // Execute functions and append response parts
        const functionResponseParts: any[] = [];
        for (const call of functionCalls) {
          if (!toolsUsed.includes(call.name)) {
            toolsUsed.push(call.name);
          }
          const toolResult = await executeTool(call.name, call.args, { user: params.user });
          if (toolResult?.action === "NAVIGATE" && toolResult?.path) {
            detectedAction = {
              type: "NAVIGATE",
              path: toolResult.path,
              pageTitle: toolResult.pageTitle || "Page",
              description: toolResult.description,
            };
          }
          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: toolResult,
            },
          });
        }

        contents.push({
          role: "user",
          parts: functionResponseParts,
        });
      }

      return {
        response: "I couldn't find enough data in the ERP to answer that accurately.",
        toolsUsed,
        action: detectedAction,
      };
    } catch (err: any) {
      lastError = err;

      // On quota / rate-limit: ALL models share the same quota key, so stop
      // cycling models immediately and let the caller fall back to OpenAI.
      if (isRateLimitError(err)) {
        console.warn("[AI] Gemini quota/rate-limit hit — switching to OpenAI fallback.");
        throw err;
      }

      console.warn(`[AI] Gemini model "${modelName}" failed (non-quota), trying next:`, err?.message || err);
    }
  }

  throw lastError || new Error("All Gemini model candidates failed.");
}

/**
 * Shared OpenAI-compatible chat loop — used by both OpenAI and Groq.
 * Pass a custom `baseURL` + `model` to target Groq.
 */
async function processWithOpenAICompat(
  apiKey: string,
  model: string,
  params: { message: string; history?: ChatHistoryMessage[]; user: AuthUser },
  baseURL?: string
): Promise<{ response: string; toolsUsed: string[]; action?: AssistantAction }> {
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const toolsUsed: string[] = [];
  let detectedAction: AssistantAction | undefined;

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
    const completion = await client.chat.completions.create({
      model,
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
          if (result?.action === "NAVIGATE" && result?.path) {
            detectedAction = {
              type: "NAVIGATE",
              path: result.path,
              pageTitle: result.pageTitle || "Page",
              description: result.description,
            };
          }
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
        action: detectedAction,
      };
    }
  }

  return { response: "Query processing complete.", toolsUsed, action: detectedAction };
}

/** OpenAI GPT-4o-mini */
async function processWithOpenAI(
  apiKey: string,
  params: { message: string; history?: ChatHistoryMessage[]; user: AuthUser }
): Promise<{ response: string; toolsUsed: string[]; action?: AssistantAction }> {
  return processWithOpenAICompat(apiKey, "gpt-4o-mini", params);
}

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
];

/**
 * Groq free-tier fallback — ultra-fast function calling.
 * Get a free key at https://console.groq.com (14,400 req/day free).
 * Uses OpenAI-compatible API via baseURL swap.
 */
async function processWithGroq(
  apiKey: string,
  params: { message: string; history?: ChatHistoryMessage[]; user: AuthUser }
): Promise<{ response: string; toolsUsed: string[]; action?: AssistantAction }> {
  let lastErr: any = null;
  for (const model of GROQ_MODELS) {
    try {
      return await processWithOpenAICompat(
        apiKey,
        model,
        params,
        "https://api.groq.com/openai/v1"
      );
    } catch (err: any) {
      lastErr = err;
      console.warn(`[AI] Groq model ${model} failed, trying next:`, err?.message || err);
    }
  }
  throw lastErr || new Error("All Groq models failed");
}

/**
 * Main AI Dispatcher — 3-tier automatic failover:
 *   1. Google Gemini  (best Malayalam, free tier)
 *   2. OpenAI GPT-4o-mini  (paid, high quality)
 *   3. Groq Llama-3.3-70b  (free tier, 14,400 req/day fallback)
 *
 * Each tier is tried in order. A quota / rate-limit error causes an
 * immediate jump to the next tier without wasting retries.
 */
export async function processAIChatMessage(params: {
  message: string;
  history?: ChatHistoryMessage[];
  user: AuthUser;
}): Promise<{ response: string; toolsUsed: string[]; provider?: string; action?: AssistantAction }> {
  const geminiKey =
    process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("your-gemini-api-key")
      ? process.env.GEMINI_API_KEY.trim()
      : "";

  const openAIKey =
    process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("your-openai-api-key")
      ? process.env.OPENAI_API_KEY.trim()
      : "";

  const groqKey =
    process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("your-groq-api-key")
      ? process.env.GROQ_API_KEY.trim()
      : "";

  if (!geminiKey && !openAIKey && !groqKey) {
    return {
      response:
        "⚠️ **No AI Provider Configured**\n\nAdd at least one key to `.env`:\n" +
        "- `GEMINI_API_KEY` — free at [aistudio.google.com](https://aistudio.google.com/app/apikey)\n" +
        "- `GROQ_API_KEY` — **free** at [console.groq.com](https://console.groq.com) (14,400 req/day)\n" +
        "- `OPENAI_API_KEY` — paid at [platform.openai.com](https://platform.openai.com)",
      toolsUsed: [],
    };
  }

  // ── TIER 1: Google Gemini ────────────────────────────────────────────────
  if (geminiKey) {
    try {
      const result = await processWithGemini(geminiKey, params);
      return { ...result, provider: "gemini" };
    } catch (err: any) {
      console.warn("[AI] Gemini failed:", err?.message || err);
      // fall through to next tier
    }
  }

  // ── TIER 2: OpenAI GPT-4o-mini ──────────────────────────────────────────
  if (openAIKey) {
    try {
      const result = await processWithOpenAI(openAIKey, params);
      return { ...result, provider: "openai" };
    } catch (err: any) {
      console.warn("[AI] OpenAI failed:", err?.message || err);
      // fall through to next tier
    }
  }

  // ── TIER 3: Groq Llama/Qwen/GPT-OSS (free) ──────────────────────────────
  if (groqKey) {
    try {
      const result = await processWithGroq(groqKey, params);
      return { ...result, provider: "groq" };
    } catch (err: any) {
      console.error("[AI] Groq fallback also failed:", err?.message || err);
      return {
        response:
          "⚠️ **All AI providers are currently unavailable.**\n\n" +
          "- Gemini & OpenAI quotas may be exhausted.\n" +
          "- Groq also returned an error.\n\n" +
          "Please check your API keys or try again in a few minutes.",
        toolsUsed: [],
      };
    }
  }

  // All configured providers failed
  return {
    response:
      "⚠️ **All configured AI providers failed.**\n\n" +
      "Add a free **Groq** key at [console.groq.com](https://console.groq.com) as a permanent backup (`GROQ_API_KEY` in `.env`).",
    toolsUsed: [],
  };
}

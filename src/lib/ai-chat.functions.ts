import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `You are MindCare, a compassionate mental health support assistant for Pakistani youth. You speak in a warm, friendly mix of English and Urdu (Hinglish). You never give medical diagnoses. You always encourage professional help for serious issues. You follow SDG 3 guidelines for mental well-being. If the user starts a new conversation, greet them with "Aaj aap kaisa feel kar rahe hain?" Give responses based on mood — if low show empathy and breathing exercises, if medium give positive reinforcement, if high celebrate and suggest journaling. Keep replies concise (2-4 short paragraphs), warm, and supportive. If user mentions self-harm or suicide, gently but firmly direct them to Umang helpline 0317-4288665 or Rozan Pakistan.`;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      messages: z.array(MessageSchema).min(1).max(40),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Too many requests — please slow down.");
      if (res.status === 402) throw new Error("AI usage limit reached. Please add credits.");
      throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "I'm here for you.";

    // Persist last user message + assistant reply
    const lastUser = data.messages[data.messages.length - 1];
    if (lastUser.role === "user") {
      await context.supabase.from("chat_history").insert([
        { user_id: context.userId, role: "user", content: lastUser.content },
        { user_id: context.userId, role: "assistant", content: reply },
      ]);
    }

    return { reply };
  });

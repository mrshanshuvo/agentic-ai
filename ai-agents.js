import OpenAI from "openai"
import dotenv from "dotenv"
dotenv.config()

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "arcee-ai/trinity-large-preview:free",
    messages: [
      { role: "user", content: "What is agentic AI?" }
    ],
  })

  console.log(completion.choices[0].message.content)
}
main();

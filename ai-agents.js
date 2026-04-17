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

const analyzeGoal = async() =>{
  const goalText = "Learn Python";
  const durationDays = "7";
  const prompt = `
  You are an expert life coach and productivity system. 
  Analyze the following user goal and create a structured, actionable plan.

  Goal: ${goalText}
  Duration: ${durationDays} days

  Your output must be a valid JSON object with this exact structure:
  {
    "goal_summary": "A concise summary of the goal",
    "is_achievable": true/false,
    "confidence_score": 0-1,
    "required_resources": ["item1", "item2"],
    "daily_tasks": [
      {
        "day": 1,
        "focus": "Main theme for the day",
        "tasks": ["Task 1", "Task 2"],
        "estimated_time_hours": 2.5
      }
    ],
    "potential_obstacles": ["Obstacle 1", "Obstacle 2"],
    "success_metrics": ["Metric 1", "Metric 2"],
    "final_recommendation": "A short paragraph with advice"
  }

  Return only the JSON object, without any additional text or explanation.
  `
  try{
    const completion = await openai.chat.completions.create({
    model: "arcee-ai/trinity-large-preview:free",
    messages: [
      { role: "user", content: prompt }
    ],
  })

  console.log(completion.choices[0].message.content)
  }catch(error){
    console.log(error)``
  }
}

analyzeGoal();

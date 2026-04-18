import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { analyzeGoal, evaluateGoal } from "./ai-agents.js";
import storage from "./storage.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AI Task Agent API",
      version: "1.0.0",
      description: "Manage goals and track progress with AI coaching.",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * @swagger
 * /api/goals:
 *   get:
 *     summary: List all goals
 *     responses:
 *       200:
 *         description: List of goals
 */
app.get("/api/goals", async (req, res) => {
  res.json(storage.getAllGoals());
});

/**
 * @swagger
 * /api/goals/{goalId}:
 *   get:
 *     summary: Get goal details and tasks
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal details
 */
app.get("/api/goals/:goalId", async (req, res) => {
  const goal = storage.getGoal(req.params.goalId);
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  res.json({
    goal,
    tasks: storage.getTasksByGoal(goal.id),
  });
});

/**
 * @swagger
 * /api/analyze-goal:
 *   post:
 *     summary: Create a new goal and AI plan
 *     parameters:
 *       - in: query
 *         name: goalText
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: durationDays
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal created
 */
app.post("/api/analyze-goal", async (req, res) => {
  try {
    const goalText = req.body.goalText || req.query.goalText;
    const durationDays = req.body.durationDays || req.query.durationDays;

    if (!goalText || !durationDays) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await analyzeGoal(goalText, durationDays);
    if (!result) return res.status(500).json({ error: "AI failed" });

    const goal = await storage.saveGoal({
      text: goalText,
      durationDays,
      status: "active",
    });

    const tasks = [];
    result.daily_tasks.forEach((dayData) => {
      dayData.tasks.forEach((taskTitle) => {
        tasks.push({
          goalId: goal.id,
          day: dayData.day,
          title: taskTitle,
          description: dayData.focus,
          completed: false,
        });
      });
    });

    await storage.saveTasks(goal.id, tasks);
    res.json({ goal, tasks: await storage.getTasksByGoal(goal.id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   patch:
 *     summary: Toggle task status
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task updated
 */
app.patch("/api/tasks/:taskId", async (req, res) => {
  const updatedTask = storage.updateTask(req.params.taskId, req.body);
  if (!updatedTask) return res.status(404).json({ error: "Task not found" });
  res.json(updatedTask);
});

/**
 * @swagger
 * /api/goals/{goalId}/evaluate:
 *   post:
 *     summary: Get AI evaluation of progress
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evaluation result
 */
app.post("/api/goals/:goalId/evaluate", async (req, res) => {
  try {
    const { goalId } = req.params;
    const goal = storage.getGoal(goalId);
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    const tasks = storage.getTasksByGoal(goalId);
    const completedTasks = tasks.filter((t) => t.completed).length;
    const createdDays = Math.ceil(
      (Date.now() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    const evaluation = await evaluateGoal(
      goal,
      tasks.length,
      completedTasks,
      createdDays,
    );
    if (!evaluation) return res.status(500).json({ error: "AI failed" });

    await storage.saveProgress(goalId, evaluation);
    res.json(evaluation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// ============ SERVER START ============

app.listen(PORT, () => {
  console.log(`🚀 AI Task Agent running on http://localhost:${PORT}`);
});

const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());


let tasks = [
  {
    id: 1,
    title: "First Task",
    description: "This is a sample task",
    completed: false,
    priority: "medium"
  },
  {
    id: 2,
    title: "Second Task",
    description: "Install Node.js, npm, and git",
    completed: false,
    priority: "high"
  }
];

app.get('/', (req, res) => {
  res.send('Task Management API is running');
});

function validateTaskInput({ title, description, completed, priority }, isUpdate = false) {
  const errors = [];

  if (!isUpdate || title !== undefined) {
    if (typeof title !== "string" || title.trim() === "") {
      errors.push("Title must be a non-empty string");
    }
  }

  if (!isUpdate || description !== undefined) {
    if (typeof description !== "string" || description.trim() === "") {
      errors.push("Description must be a non-empty string");
    }
  }

  if (completed !== undefined && typeof completed !== "boolean") {
    errors.push("Completed must be a boolean value");
  }

  if (!isUpdate || priority !== undefined) {
    const validPriorities = ["low", "medium", "high"];
    if (!validPriorities.includes(priority)) {
      errors.push("Priority must be one of: low, medium, high");
    }
  }

  return errors;
}

app.get("/api/tasks", (req, res) => {
    res.send(tasks);
});

app.get("/api/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(task);
});


app.post("/api/tasks", (req, res) => {
  const newTask = req.body;  

  const errors = validateTaskInput(newTask);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  newTask.id = tasks.length ? tasks[tasks.length - 1].id + 1 : 1;
  tasks.push(newTask);

  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const errors = validateTaskInput(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { title, description, completed, priority } = req.body;

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (completed !== undefined) task.completed = completed;
  if (priority !== undefined) task.priority = priority;

  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const deletedTask = tasks.splice(index, 1)[0];
  res.json({ message: "Task deleted", task: deletedTask });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

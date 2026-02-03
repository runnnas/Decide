# Decide ⚡️

A minimalist "Action Engine" that combats decision fatigue by filtering tasks based on your energy level and choosing for you.

## 🚀 Live Demo
[decide-a.vercel.app](https://decide-a.vercel.app)

## 🧠 What It Does
Decide removes the friction of choice. Instead of a standard to-do list, users select a "Vibe" (Chill, Mid, or All Out) and a "System" (Meals, Workouts, etc.). The app randomly selects **one** actionable task and immediately locks you into a focus mode to get it done.

## 🧩 Features
* **Smart Randomizer:** Filters tasks based on your selected energy level.
* **Focus Mode:** A built-in timer that dims distractions so you can execute the task immediately.
* **TV Mode:** Automatically loads relevant YouTube Shorts or tutorials for the specific task.
* **Custom Systems:** Users can create and manage their own lists of tasks.
* **Living Background:** Dynamic "Aurora" background that adapts to dark/light mode.

## 🛠 Tech Stack
**Frontend:** Next.js (React), Tailwind CSS
**State Management:** React Hooks
**Deployment:** Vercel

## ⚙️ Core Logic
Task selection is handled through filtered randomization. Tasks are first narrowed based on the user’s selected energy level and system, then one task is chosen using an unbiased random selection approach to avoid repetitive or predictable outcomes.


## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/runnnas/Decide.git](https://github.com/runnnas/Decide.git)
   cd Decide

2. Install dependencies
  ```bash
npm install


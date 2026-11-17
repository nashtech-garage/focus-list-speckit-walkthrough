function addTask(tasks, title, id) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || !id) return tasks;
  return [{ id, title: trimmedTitle, completed: false }, ...tasks];
}

function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
}

function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'completed') return tasks.filter((task) => task.completed);
  return tasks;
}

module.exports = { addTask, toggleTask, deleteTask, filterTasks };
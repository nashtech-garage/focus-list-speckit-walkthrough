const test = require('node:test');
const assert = require('node:assert/strict');
const { addTask, toggleTask, deleteTask, filterTasks } = require('./tasks');

test('trims new tasks and rejects blank titles', () => {
  const tasks = addTask([], '  Prepare demo  ', 'task-1');
  assert.deepEqual(tasks, [{ id: 'task-1', title: 'Prepare demo', completed: false }]);
  assert.equal(addTask(tasks, '   ', 'task-2'), tasks);
});

test('toggles, filters and deletes without mutating existing tasks', () => {
  const original = addTask([], 'Prepare demo', 'task-1');
  const updated = toggleTask(original, 'task-1');
  assert.equal(original[0].completed, false);
  assert.equal(filterTasks(updated, 'active').length, 0);
  assert.equal(filterTasks(updated, 'completed').length, 1);
  assert.deepEqual(deleteTask(updated, 'task-1'), []);
});
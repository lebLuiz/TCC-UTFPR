import { TaskItem } from './TaskItem';
import type { Task } from '../../../shared/core/task';
import { MESSAGES } from '../../../shared/core/task';

interface TaskListProps {
  tasks: Task[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}

export function TaskList(props: TaskListProps) {
  return (
    <section className="panel">
      {props.tasks.length === 0 ? (
        <p className="empty-state" data-testid="empty-state">
          {MESSAGES.emptyState}
        </p>
      ) : (
        <ul className="task-list" data-testid="task-list">
          {props.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
              onToggle={props.onToggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

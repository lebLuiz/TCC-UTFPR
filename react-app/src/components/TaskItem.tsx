import type { Task } from '../../../shared/core/task';
import { MESSAGES, formatTimestamp } from '../../../shared/core/task';

interface TaskItemProps {
  task: Task;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}

export function TaskItem(props: TaskItemProps) {
  const { task } = props;

  return (
    <li
      className={task.completed ? 'task-item task-item--completed' : 'task-item'}
      data-task-id={task.id}
      data-testid="task-item"
    >
      <div className="task-content">
        <div className="task-title" data-testid="task-item-title">
          {task.title}
        </div>

        {task.description !== '' && (
          <div className="task-description" data-testid="task-item-description">
            {task.description}
          </div>
        )}

        <div className="task-meta">
          <span
            className={task.completed ? 'task-status task-status--completed' : 'task-status'}
            data-testid="task-item-status"
          >
            {task.completed ? MESSAGES.statusCompleted : MESSAGES.statusPending}
          </span>
          <span className="task-meta-text">
            {MESSAGES.columnUpdatedAt}: {formatTimestamp(task.updatedAt)}
          </span>
        </div>
      </div>

      <div className="task-actions">
        <button
          className="button button--small"
          data-testid="toggle-task-button"
          type="button"
          onClick={() => props.onToggle(task.id)}
        >
          {task.completed ? MESSAGES.buttonUncomplete : MESSAGES.buttonComplete}
        </button>
        <button
          className="button button--small"
          data-testid="edit-task-button"
          type="button"
          onClick={() => props.onEdit(task.id)}
        >
          {MESSAGES.buttonEdit}
        </button>
        <button
          className="button button--small button--danger"
          data-testid="delete-task-button"
          type="button"
          onClick={() => props.onDelete(task.id)}
        >
          {MESSAGES.buttonDelete}
        </button>
      </div>
    </li>
  );
}

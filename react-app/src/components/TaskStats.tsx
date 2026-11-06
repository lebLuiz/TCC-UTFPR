import { MESSAGES } from '../../../shared/core/task';

interface TaskStatsProps {
  total: number;
  completed: number;
  pending: number;
}

export function TaskStats(props: TaskStatsProps) {
  return (
    <section className="stats" data-testid="task-stats">
      <div className="stat">
        <span className="stat-label">{MESSAGES.statsTotal}</span>
        <span className="stat-value" data-testid="total-count">
          {props.total}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">{MESSAGES.statsCompleted}</span>
        <span className="stat-value" data-testid="completed-count">
          {props.completed}
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">{MESSAGES.statsPending}</span>
        <span className="stat-value" data-testid="pending-count">
          {props.pending}
        </span>
      </div>
    </section>
  );
}

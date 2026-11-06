import { MESSAGES, DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../../shared/core/task';

interface TaskFormProps {
  title: string;
  description: string;
  completed: boolean;
  isEditing: boolean;
  errorMessage: string;
  successMessage: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompletedChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function TaskForm(props: TaskFormProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">
        {props.isEditing ? MESSAGES.formLegendEdit : MESSAGES.formLegendCreate}
      </h2>

      {props.errorMessage !== '' && (
        <p className="message message--error" data-testid="error-message" role="alert">
          {props.errorMessage}
        </p>
      )}

      {props.successMessage !== '' && (
        <p className="message message--success" data-testid="success-message" role="status">
          {props.successMessage}
        </p>
      )}

      <form
        className="task-form"
        data-testid="task-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <div className="form-field">
          <label className="form-label" htmlFor="task-title">
            {MESSAGES.labelTitle}
          </label>
          <input
            className="form-input"
            data-testid="task-title-input"
            id="task-title"
            maxLength={TITLE_MAX_LENGTH}
            placeholder={MESSAGES.placeholderTitle}
            type="text"
            value={props.title}
            onChange={(event) => props.onTitleChange(event.target.value)}
          />
          <p className="form-hint">
            {props.title.length}/{TITLE_MAX_LENGTH}
          </p>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="task-description">
            {MESSAGES.labelDescription}
          </label>
          <textarea
            className="form-textarea"
            data-testid="task-description-input"
            id="task-description"
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder={MESSAGES.placeholderDescription}
            value={props.description}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
          />
          <p className="form-hint">
            {props.description.length}/{DESCRIPTION_MAX_LENGTH}
          </p>
        </div>

        <div className="form-checkbox-field">
          <input
            checked={props.completed}
            className="form-checkbox"
            data-testid="task-completed-input"
            id="task-completed"
            type="checkbox"
            onChange={(event) => props.onCompletedChange(event.target.checked)}
          />
          <label className="form-label" htmlFor="task-completed">
            {MESSAGES.labelCompleted}
          </label>
        </div>

        <div className="form-actions">
          {props.isEditing ? (
            <button className="button button--primary" data-testid="save-task-button" type="submit">
              {MESSAGES.buttonSave}
            </button>
          ) : (
            <button className="button button--primary" data-testid="add-task-button" type="submit">
              {MESSAGES.buttonAdd}
            </button>
          )}

          {props.isEditing && (
            <button
              className="button"
              data-testid="cancel-edit-button"
              type="button"
              onClick={props.onCancel}
            >
              {MESSAGES.buttonCancel}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

interface InlineEditableTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  compact?: boolean;
}

interface InlineEditableHighlightsProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  addLabel?: string;
}

export function InlineEditableText({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  compact = false
}: InlineEditableTextProps): JSX.Element {
  return (
    <label className={`inline-editor ${compact ? "inline-editor-compact" : ""}`}>
      <span className="inline-editor-label">{label}</span>
      {multiline ? (
        <textarea
          className="inline-editor-field inline-editor-textarea"
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="inline-editor-field"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function InlineEditableHighlights({
  label,
  values,
  onChange,
  addLabel = "新增一条要点"
}: InlineEditableHighlightsProps): JSX.Element {
  const safeValues = values.length > 0 ? values : [""];

  function updateAt(index: number, nextValue: string): void {
    onChange(
      safeValues.map((value, valueIndex) => {
        return valueIndex === index ? nextValue : value;
      })
    );
  }

  function removeAt(index: number): void {
    const nextValues = safeValues.filter((_, valueIndex) => valueIndex !== index);
    onChange(nextValues.length > 0 ? nextValues : [""]);
  }

  return (
    <div className="inline-list-editor">
      <div className="inline-list-header">
        <span className="inline-editor-label">{label}</span>
        <button type="button" className="mini-btn" onClick={() => onChange([...safeValues, ""])}>
          {addLabel}
        </button>
      </div>

      <div className="inline-list-grid">
        {safeValues.map((value, index) => (
          <div className="inline-list-row" key={`${label}-${index}`}>
            <input
              className="inline-editor-field"
              value={value}
              placeholder={`第 ${index + 1} 条要点`}
              onChange={(event) => updateAt(index, event.target.value)}
            />
            <button type="button" className="mini-btn mini-btn-danger" onClick={() => removeAt(index)}>
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
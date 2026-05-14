import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';

export interface PresetTextInputOption {
  value: string;
  label?: string;
}

export interface PresetTextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string;
  defaultValue?: string;
  options: PresetTextInputOption[];
  onValueChange?: (value: string) => void;
  onValueCommit?: (value: string) => void;
}

function stopNativeEscape(event: React.KeyboardEvent<HTMLInputElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 'calc(100% + 4px)',
  zIndex: 30,
  padding: 4,
  border: '1px solid var(--ink-200)',
  borderRadius: 5,
  background: 'var(--bg-elevated)',
  boxShadow: 'var(--shadow-pop)',
  maxHeight: 190,
  overflowY: 'auto',
};

const optionStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  borderRadius: 4,
  padding: '6px 8px',
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 8,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'var(--font-ui)',
};

const valueStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  fontWeight: 600,
};

const labelStyle: React.CSSProperties = {
  flexShrink: 0,
  maxWidth: '48%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 10.5,
  color: 'var(--ink-500)',
};

const PresetTextInput = forwardRef<HTMLInputElement, PresetTextInputProps>(function PresetTextInput(
  {
    value,
    defaultValue,
    options,
    onValueChange,
    onValueCommit,
    onBlur,
    onFocus,
    onKeyDown,
    style,
    ...inputProps
  },
  forwardedRef,
) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draftValue, setDraftValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const controlled = value !== undefined;
  const inputValue = controlled ? value : draftValue;

  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (!controlled) setDraftValue(defaultValue ?? '');
  }, [controlled, defaultValue]);

  const visibleOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    return options
      .filter((option) => {
        if (!query) return true;
        const label = option.label ?? '';
        return option.value.toLowerCase().includes(query) || label.toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [inputValue, options]);

  useEffect(() => {
    setActiveIndex(0);
  }, [inputValue]);

  function setInputValue(nextValue: string) {
    if (!controlled) setDraftValue(nextValue);
    onValueChange?.(nextValue);
  }

  function commitValue(nextValue: string) {
    setInputValue(nextValue);
    setOpen(false);
    onValueCommit?.(nextValue);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
    setOpen(true);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    onBlur?.(event);
    onValueCommit?.(event.currentTarget.value);
    window.setTimeout(() => setOpen(false), 80);
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    onFocus?.(event);
    setOpen(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && visibleOptions[activeIndex]) {
      event.preventDefault();
      commitValue(visibleOptions[activeIndex].value);
      return;
    }

    if (event.key === 'Escape' && open) {
      stopNativeEscape(event);
      setOpen(false);
    }
  }

  const shouldShowMenu = open && visibleOptions.length > 0;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...inputProps}
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shouldShowMenu}
        aria-controls={listboxId}
        style={style}
      />
      {shouldShowMenu && (
        <div id={listboxId} role="listbox" style={menuStyle}>
          {visibleOptions.map((option, index) => {
            const active = index === activeIndex;
            const selected = option.value === inputValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitValue(option.value);
                  window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
                style={{
                  ...optionStyle,
                  background: active ? 'var(--bg-hover)' : selected ? 'var(--bg-canvas)' : 'transparent',
                  color: selected ? 'var(--ink-900)' : 'var(--ink-700)',
                }}
              >
                <span style={valueStyle}>{option.value}</span>
                {option.label && option.label !== option.value && (
                  <span style={labelStyle}>{option.label}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default PresetTextInput;

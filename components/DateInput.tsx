import React, { useRef } from 'react';

interface DateInputProps {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  readOnly?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange, className, readOnly }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleMouseEnter = () => {
    if (readOnly) return;
    try {
      if (inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        (inputRef.current as any).showPicker();
      }
    } catch (e) {}
  };

  return (
    <input 
      type="date" 
      ref={inputRef}
      value={value} 
      onChange={onChange} 
      onMouseEnter={handleMouseEnter}
      readOnly={readOnly}
      className={className}
    />
  );
};

export default DateInput;

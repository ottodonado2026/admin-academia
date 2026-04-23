import { useEffect, useRef, useState } from "react";

function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select ${open ? "open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className={selectedOption ? "" : "placeholder"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="custom-select-arrow">⌄</span>
      </button>

      {open && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`custom-select-option ${
                String(option.value) === String(value) ? "selected" : ""
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
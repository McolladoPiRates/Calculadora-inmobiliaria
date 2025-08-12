import React from "react";
export function Select({ value, onValueChange, children }) {
  const items = [];
  React.Children.forEach(children, child => {
    if (child && child.props && child.type && child.type.displayName==="SelectContent") {
      React.Children.forEach(child.props.children, item => {
        if (item && item.type && item.type.displayName==="SelectItem")
          items.push(item.props);
      });
    }
  });
  return (
    <select
      className="w-full h-10 px-3 rounded-md border border-emerald-500 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      value={value||""}
      onChange={e=>onValueChange(e.target.value)}
    >
      <option value="" disabled>Seleccionar</option>
      {items.map(it => <option key={it.value} value={it.value}>{it.children}</option>)}
    </select>
  );
}
export function SelectTrigger({ children, className="", ...props }) {
  return <div className={className}>{children}</div>;
}
export function SelectValue({ placeholder }) {
  return <span className="text-neutral-500">{placeholder}</span>;
}
function SelectContentImpl({ children }) { return <>{children}</>; }
SelectContentImpl.displayName = "SelectContent";
export const SelectContent = SelectContentImpl;
function SelectItemImpl({ value, children }) { return <option value={value}>{children}</option>; }
SelectItemImpl.displayName = "SelectItem";
export const SelectItem = SelectItemImpl;

import React from "react";

let tooltipId = 0;
const nextId = () => `tooltip-${++tooltipId}`;

export function TooltipProvider({ children }) {
  return children;
}

export function Tooltip({ children }) {
  const id = nextId();
  const [trigger, content] = React.Children.toArray(children);
  const triggerWithId = React.cloneElement(trigger, { tooltipId: id });
  const contentWithId = React.cloneElement(content, { id });
  return React.createElement(
    "span",
    { className: "relative inline-block group" },
    triggerWithId,
    contentWithId
  );
}

export function TooltipTrigger({ asChild = false, tooltipId, children, ...props }) {
  const triggerProps = { "aria-describedby": tooltipId, ...props };
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, triggerProps);
  }
  return React.createElement("span", triggerProps, children);
}

export function TooltipContent({ id, className = "", children, ...props }) {
  return React.createElement(
    "span",
    {
      id,
      role: "tooltip",
      className: `absolute z-50 mt-2 hidden group-hover:block group-focus-within:block ${className}`,
      ...props
    },
    children
  );
}

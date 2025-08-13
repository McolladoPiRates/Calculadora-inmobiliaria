import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip.js';

test('Tooltip wires trigger and content with aria-describedby and hover/focus classes', () => {
  const tooltipElement = Tooltip({
    children: [
      React.createElement(
        TooltipTrigger,
        { asChild: true },
        React.createElement('button', null, 'Trigger')
      ),
      React.createElement(TooltipContent, { className: 'extra' }, 'Tip text')
    ]
  });

  const [triggerEl, contentEl] = tooltipElement.props.children;
  const renderedTrigger = triggerEl.type({ ...triggerEl.props });
  const renderedContent = contentEl.type({ ...contentEl.props });

  const triggerProps = renderedTrigger.props;
  const contentProps = renderedContent.props;

  assert.equal(triggerProps['aria-describedby'], contentProps.id);
  assert.ok(contentProps.className.includes('group-hover:block'));
  assert.ok(contentProps.className.includes('group-focus-within:block'));
  assert.equal(contentProps.role, 'tooltip');
});

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * ResponsiveListCard - A reusable component for displaying lists of items in a responsive card layout
 * 
 * @param {Array} items - Array of items to display
 * @param {Function} renderIcon - Function to render the icon for each item (item) => JSX
 * @param {Function} renderContent - Function to render the main content columns (item) => JSX
 * @param {Function} renderActions - Function to render action buttons (item) => JSX
 * @param {Object} emptyState - Configuration for empty state display
 * @param {React.Component} emptyState.icon - Icon component to display
 * @param {string} emptyState.title - Title for empty state
 * @param {string} emptyState.message - Message for empty state
 * @param {Object} emptyState.action - Optional action button config
 * @param {string} emptyState.action.label - Button label
 * @param {Function} emptyState.action.onClick - Button click handler
 * @param {React.Component} emptyState.action.icon - Button icon
 */
export const ResponsiveListCard = ({
  items,
  renderIcon,
  renderContent,
  renderActions,
  emptyState
}) => {
  // Show empty state if no items
  if (items.length === 0 && emptyState) {
    const EmptyIcon = emptyState.icon;
    const ActionIcon = emptyState.action?.icon;
    
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <EmptyIcon className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
          <p className="text-gray-500 text-sm mb-4">{emptyState.message}</p>
          {emptyState.action && (
            <Button onClick={emptyState.action.onClick}>
              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
              {emptyState.action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render list of items
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Icon */}
              {renderIcon && (
                <div className="flex-shrink-0">
                  {renderIcon(item)}
                </div>
              )}

              {/* Main Content */}
              {renderContent(item)}

              {/* Action Buttons */}
              {renderActions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderActions(item)}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsiveListCard;

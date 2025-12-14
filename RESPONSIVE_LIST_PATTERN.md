# Responsive List Pattern - Reusable Component Design

## Overview
This document describes the standardized responsive list pattern used across all list views in the application (Vessels, Crew, Trips, etc.). This pattern ensures consistency and optimal user experience across all device sizes.

## Design Philosophy

### Why Card-Based Lists?
- **Mobile-First**: Works seamlessly from mobile (320px) to desktop (1920px+)
- **Progressive Enhancement**: Shows more information as screen size increases
- **Touch-Friendly**: Large clickable areas for mobile users
- **Accessibility**: Clear visual hierarchy and keyboard navigation

### Why NOT Tables?
- Tables don't respond well to mobile screens
- Require horizontal scrolling on small devices
- Poor touch targets for mobile users
- Difficult to maintain visual hierarchy on small screens

## Responsive Breakpoints

The pattern uses Tailwind's standard breakpoints:

| Breakpoint | Width | Fields Displayed | Use Case |
|------------|-------|------------------|----------|
| Default (xs) | <640px | Essential only (2-3 fields) | Mobile phones |
| sm | ≥640px | Core fields (4-5 fields) | Large phones, small tablets |
| md | ≥768px | Extended fields (5-6 fields) | Tablets |
| lg | ≥1024px | Full fields (7-8 fields) | Laptops |
| xl | ≥1280px | All fields (8+ fields) | Desktop monitors |

## Standard Pattern Structure

### 1. Empty State
```jsx
{filteredItems.length === 0 ? (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-12">
      <IconComponent className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">No items found</h3>
      <p className="text-gray-500 text-sm mb-4">
        {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first item'}
      </p>
      {canEdit && !searchQuery && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      )}
    </CardContent>
  </Card>
) : (
  // List content
)}
```

### 2. List Container
```jsx
<Card>
  <CardContent className="p-0">
    <div className="divide-y">
      {filteredItems.map((item) => (
        // Item row
      ))}
    </div>
  </CardContent>
</Card>
```

### 3. Item Row Structure

**Core Components (Always Visible):**
```jsx
<div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
  {/* 1. Icon (Always visible) */}
  <div className="flex-shrink-0">
    <IconComponent className="h-5 w-5 text-blue-600" />
  </div>

  {/* 2. Primary Field (Always visible, can wrap on mobile) */}
  <div className="flex-1 min-w-0">
    <div className="font-semibold text-gray-900 truncate">
      {item.primaryField}
    </div>
    {/* Mobile-only secondary info */}
    <div className="text-sm text-gray-500 truncate sm:hidden">
      {item.mobileSecondaryField}
    </div>
  </div>

  {/* 3-8. Progressive Fields (Hidden on smaller screens) */}
  <div className="hidden sm:block w-32 flex-shrink-0">
    <span className="text-sm text-gray-600">{item.field1}</span>
  </div>

  <div className="hidden sm:block flex-shrink-0">
    <Badge>{item.field2}</Badge>
  </div>

  <div className="hidden md:block w-36 flex-shrink-0">
    <span className="text-sm text-gray-600">{item.field3}</span>
  </div>

  <div className="hidden lg:block w-28 flex-shrink-0">
    <span className="text-sm text-gray-600">{item.field4}</span>
  </div>

  <div className="hidden xl:block flex-shrink-0">
    <Badge>{item.field5}</Badge>
  </div>

  <div className="hidden xl:block w-28 flex-shrink-0">
    <span className="text-sm text-gray-600">{item.field6}</span>
  </div>

  {/* 9. Action Buttons (Always visible) */}
  <div className="flex items-center gap-2 flex-shrink-0">
    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
      <Edit className="h-4 w-4" />
    </Button>
    <Button 
      size="sm" 
      variant="ghost"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={() => handleDelete(item.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

## Field Priority Guide

### How to Decide What Shows at Each Breakpoint

**Always Visible (Mobile & Up):**
1. Icon/Visual identifier
2. Primary name/title (truncated if needed)
3. Action buttons (Edit, Delete)

**Show at SM (≥640px):**
4. Secondary identifier (ID, registration, etc.)
5. Type/Category badge

**Show at MD (≥768px):**
6. Owner/Responsible person
7. Additional context field

**Show at LG (≥1024px):**
8. Specifications/Details
9. Date fields

**Show at XL (≥1280px):**
10. Status badges
11. Extended information

## Implementation Examples

### Example 1: Vessel List
```jsx
<div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
  {/* Icon - Always visible */}
  <div className="flex-shrink-0">
    <Ship className="h-5 w-5 text-blue-600" />
  </div>

  {/* Name - Always visible */}
  <div className="flex-1 min-w-0">
    <div className="font-semibold text-gray-900 truncate">
      {vessel.vessel_name}
    </div>
    <div className="text-sm text-gray-500 truncate sm:hidden">
      {vessel.vessel_type}
    </div>
  </div>

  {/* Registration - SM+ */}
  <div className="hidden sm:block w-32 flex-shrink-0">
    <span className="text-sm text-gray-600">
      {vessel.registration_number || '-'}
    </span>
  </div>

  {/* Type - SM+ */}
  <div className="hidden sm:block flex-shrink-0">
    <Badge variant="outline">{vessel.vessel_type}</Badge>
  </div>

  {/* Owner - MD+ */}
  <div className="hidden md:block w-36 flex-shrink-0">
    <span className="text-sm text-gray-600 truncate block">
      {vessel.owner_name || '-'}
    </span>
  </div>

  {/* Specs - LG+ */}
  <div className="hidden lg:block w-28 flex-shrink-0 text-center">
    <span className="text-sm text-gray-600">
      {vessel.length}m × {vessel.beam}m
    </span>
  </div>

  {/* Status - XL+ */}
  <div className="hidden xl:block flex-shrink-0">
    <Badge variant={vessel.status === 'Operational' ? 'default' : 'secondary'}>
      {vessel.status}
    </Badge>
  </div>

  {/* Actions - Always visible */}
  <div className="flex items-center gap-2 flex-shrink-0">
    <Button size="sm" variant="ghost" onClick={() => handleEdit(vessel)}>
      <Edit className="h-4 w-4" />
    </Button>
    <Button 
      size="sm" 
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      onClick={() => handleDelete(vessel.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### Example 2: Crew List
```jsx
<div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
  <div className="flex-shrink-0">
    <Users className="h-5 w-5 text-orange-600" />
  </div>

  <div className="flex-1 min-w-0">
    <div className="font-semibold text-gray-900 truncate">
      {member.staff_name}
    </div>
  </div>

  <div className="hidden sm:block w-32 flex-shrink-0">
    <span className="text-sm text-gray-600">
      {member.default_position || '-'}
    </span>
  </div>

  <div className="hidden md:block flex-shrink-0">
    <Badge variant="outline">{member.role || 'Crew'}</Badge>
  </div>

  <div className="hidden lg:block w-36 flex-shrink-0">
    <span className="text-sm text-gray-600">{member.mobile || '-'}</span>
  </div>

  <div className="hidden xl:block w-24 flex-shrink-0 text-center">
    <span className="text-sm text-gray-600">
      {member.qualifications?.length || 0} quals
    </span>
  </div>

  <div className="flex items-center gap-2 flex-shrink-0">
    <Button size="sm" variant="ghost" onClick={() => handleView(member)}>
      <Eye className="h-4 w-4" />
    </Button>
    <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
      <Edit className="h-4 w-4" />
    </Button>
    <Button 
      size="sm" 
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      onClick={() => handleDelete(member.id)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

## Best Practices

### 1. Consistent Widths
Use consistent width classes for similar field types:
- IDs/Short codes: `w-24` or `w-28`
- Names/Text: `w-32` or `w-36`
- Longer text: `w-40` or `w-48`
- Always use `flex-shrink-0` to prevent squishing

### 2. Truncation
- Use `truncate` class for long text that should be cut off
- Use `block` with `truncate` for consistent behavior
- Consider showing full text on hover with `title` attribute

### 3. Mobile-First Content
On mobile, show in the primary field area:
```jsx
<div className="flex-1 min-w-0">
  <div className="font-semibold text-gray-900 truncate">
    {item.name}
  </div>
  {/* Show most important secondary info on mobile only */}
  <div className="text-sm text-gray-500 truncate sm:hidden">
    {item.mostImportantField}
  </div>
</div>
```

### 4. Icon Consistency
- Use 5x5 (h-5 w-5) for list item icons
- Use consistent colors per entity type:
  - Vessels: `text-blue-600`
  - Crew: `text-orange-600`
  - Trips: `text-green-600`
  - Documents: `text-purple-600`

### 5. Action Button Patterns
```jsx
<div className="flex items-center gap-2 flex-shrink-0">
  {/* View - Optional, blue */}
  <Button size="sm" variant="ghost" onClick={handleView} title="View details">
    <Eye className="h-4 w-4" />
  </Button>
  
  {/* Edit - Conditional based on permissions */}
  {canEdit && (
    <Button size="sm" variant="ghost" onClick={handleEdit} title="Edit">
      <Edit className="h-4 w-4" />
    </Button>
  )}
  
  {/* Delete - Conditional based on permissions, red styling */}
  {canDelete && (
    <Button 
      size="sm" 
      variant="ghost"
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={handleDelete}
      title="Delete"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )}
</div>
```

### 6. Hover States
```jsx
<div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
  {/* Content */}
</div>
```

## Testing Checklist

When implementing or updating a list component:

- [ ] Test on mobile (375px width)
  - [ ] Essential fields visible
  - [ ] Action buttons accessible
  - [ ] No horizontal scroll
  - [ ] Proper text truncation
  
- [ ] Test on tablet (768px width)
  - [ ] Core fields visible
  - [ ] Layout looks balanced
  - [ ] Touch targets adequate
  
- [ ] Test on desktop (1920px width)
  - [ ] All fields visible
  - [ ] Proper spacing
  - [ ] No layout breaking

- [ ] Test interactions
  - [ ] Edit button works
  - [ ] Delete button works
  - [ ] View button works (if applicable)
  - [ ] Hover states work
  
- [ ] Test empty state
  - [ ] Message displays correctly
  - [ ] Add button shows for authorized users
  - [ ] Responsive on all sizes

## Migration Guide

### Converting a Table to Responsive List

**Before (Table):**
```jsx
<table className="w-full">
  <thead>
    <tr>
      <th>Name</th>
      <th>Field 1</th>
      {/* ... */}
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>{item.field1}</td>
        {/* ... */}
      </tr>
    ))}
  </tbody>
</table>
```

**After (Responsive Card List):**
```jsx
<Card>
  <CardContent className="p-0">
    <div className="divide-y">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          
          {/* Primary Field */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{item.name}</div>
          </div>
          
          {/* Progressive Fields */}
          <div className="hidden sm:block w-32 flex-shrink-0">
            {item.field1}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            {/* Buttons */}
          </div>
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

## Component Checklist

All list components should include:
- [ ] Responsive card-based layout
- [ ] Progressive field display (xs → xl breakpoints)
- [ ] Consistent icon usage
- [ ] Proper action buttons with permissions
- [ ] Empty state with helpful message
- [ ] Hover states
- [ ] Consistent spacing (gap-4, p-4)
- [ ] Truncation for long text
- [ ] Mobile-first approach

---

**Last Updated**: December 14, 2024  
**Components Using This Pattern**: Vessels, Crew, Trips, (extend to others as needed)  
**Maintained By**: Development Team

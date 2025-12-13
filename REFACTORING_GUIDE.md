# Advanced Filters Refactoring Guide

## Overview
This document describes the new `useAdvancedFilters` custom React hook that has been created to eliminate code duplication across components that implement advanced filtering functionality.

## Problem Statement
Multiple components in the application (`Maintenance`, `Incidents`, `VesselManagement`, `CrewManagement`, `Compliance`, `Emergency`, etc.) had duplicated filter logic including:
- Multi-select filter arrays (statuses, types, priorities, etc.)
- Date range filtering (start_date, end_date)
- Toggle functions to add/remove items from filter arrays
- Clear functions for specific filters or all filters

This duplication led to:
- **Maintenance burden**: Changes needed to be replicated across all components
- **Inconsistency risk**: Different implementations might have subtle differences
- **Code bloat**: Same logic repeated in 6+ files

## Solution: `useAdvancedFilters` Hook

### Location
`/app/frontend/src/hooks/useAdvancedFilters.js`

### Features
- Centralized state management for complex filters
- Multi-select array support (for statuses, types, priorities, etc.)
- Date range support (start_date, end_date)
- Helper functions for common filter operations
- Type-safe and reusable

### API Reference

#### Initialization
```javascript
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const {
  filters,
  setFilters,
  toggleFilter,
  clearFilter,
  clearDateFilters,
  clearAllFilters,
  setFilterValue,
  updateFilters,
  hasActiveFilters
} = useAdvancedFilters({
  statuses: [],
  priorities: [],
  start_date: '',
  end_date: ''
});
```

#### Return Values

| Function | Description | Usage Example |
|----------|-------------|---------------|
| `filters` | Current filter state object | `filters.statuses`, `filters.start_date` |
| `setFilters` | Direct state setter (advanced use) | `setFilters({ statuses: ['Active'] })` |
| `toggleFilter(type, value)` | Add/remove value from array filter | `toggleFilter('statuses', 'Completed')` |
| `clearFilter(type)` | Clear a specific filter | `clearFilter('statuses')` |
| `clearDateFilters()` | Clear start_date and end_date | `clearDateFilters()` |
| `clearAllFilters()` | Reset all filters to initial state | `clearAllFilters()` |
| `setFilterValue(type, value)` | Set a filter to a specific value | `setFilterValue('start_date', '2024-01-01')` |
| `updateFilters(updates)` | Update multiple filters at once | `updateFilters({ statuses: ['Active'], start_date: '2024-01-01' })` |
| `hasActiveFilters()` | Check if any filters are active | `if (hasActiveFilters()) { ... }` |

## Migration Examples

### Before Refactoring (Old Code)
```javascript
const MyComponent = () => {
  const [filters, setFilters] = useState({
    statuses: [],
    priorities: [],
    start_date: '',
    end_date: ''
  });

  const toggleFilter = (filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType];
      const isSelected = currentArray.includes(value);
      return {
        ...prev,
        [filterType]: isSelected 
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  };

  const clearFilter = (filterType) => {
    setFilters(prev => ({...prev, [filterType]: []}));
  };

  const clearDateFilters = () => {
    setFilters(prev => ({...prev, start_date: '', end_date: ''}));
  };

  const clearAllFilters = () => {
    setFilters({statuses: [], priorities: [], start_date: '', end_date: ''});
  };

  // ... rest of component
};
```

### After Refactoring (New Code)
```javascript
import useAdvancedFilters from '../hooks/useAdvancedFilters';

const MyComponent = () => {
  const {
    filters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters,
    setFilterValue
  } = useAdvancedFilters({
    statuses: [],
    priorities: [],
    start_date: '',
    end_date: ''
  });

  // All filter functions are ready to use!
  // No need to define toggleFilter, clearFilter, etc.
};
```

## Implementation Checklist

When refactoring a component to use `useAdvancedFilters`:

### Step 1: Import the Hook
```javascript
import useAdvancedFilters from '../hooks/useAdvancedFilters';
```

### Step 2: Replace State Declaration
**Remove:**
```javascript
const [filters, setFilters] = useState({
  statuses: [],
  priorities: [],
  start_date: '',
  end_date: ''
});
```

**Add:**
```javascript
const {
  filters,
  setFilters,
  toggleFilter,
  clearFilter,
  clearDateFilters,
  clearAllFilters,
  setFilterValue
} = useAdvancedFilters({
  statuses: [],
  priorities: [],
  start_date: '',
  end_date: ''
});
```

### Step 3: Remove Redundant Functions
Delete these functions from your component:
- `toggleFilter`
- `clearFilter`
- `clearDateFilters`
- Any custom clear/toggle logic

### Step 4: Update Direct State Updates
**Before:**
```javascript
onChange={(e) => setFilters({...filters, start_date: e.target.value})}
```

**After:**
```javascript
onChange={(e) => setFilterValue('start_date', e.target.value)}
```

### Step 5: Update clearAllFilters if Needed
If your `clearAllFilters` includes additional logic (like clearing search):
```javascript
const clearAll = () => {
  setSearchQuery('');
  clearAllFilters(); // from hook
};
```

### Step 6: Test Thoroughly
- ✅ Multi-select filters work correctly
- ✅ Date range filters apply properly
- ✅ Clear buttons reset the correct filters
- ✅ Summary cards (if any) still function
- ✅ No runtime errors in console

## Components to Refactor

### ✅ Completed
- [x] Maintenance.jsx - **DONE** (example implementation)

### 🔄 Pending Refactoring
- [ ] Incidents.jsx
- [ ] VesselManagement.jsx
- [ ] CrewManagement.jsx
- [ ] Compliance.jsx (has dual filter sets - certificates & requirements)
- [ ] Emergency.jsx (has triple filter sets - contacts, procedures & drills)
- [ ] RiskAssessment.jsx
- [ ] TripManagement.jsx

### Special Cases

#### Compliance.jsx
Has separate filter states for certificates and requirements:
```javascript
// Use two separate instances of the hook
const certFilters = useAdvancedFilters({ types: [], statuses: [], start_date: '', end_date: '' });
const reqFilters = useAdvancedFilters({ categories: [], statuses: [], start_date: '', end_date: '' });
```

#### Emergency.jsx
Has three separate filter states (contacts, procedures, drills):
```javascript
const contactFilters = useAdvancedFilters({ types: [], priorities: [], start_date: '', end_date: '' });
const procedureFilters = useAdvancedFilters({ types: [], start_date: '', end_date: '' });
const drillFilters = useAdvancedFilters({ types: [], vessels: [], start_date: '', end_date: '' });
```

## Benefits After Full Refactoring

1. **Code Reduction**: ~100-150 lines removed per component (6+ components = ~600-900 lines saved)
2. **Single Source of Truth**: Filter logic maintained in one place
3. **Consistency**: All components use identical filter behavior
4. **Easier Testing**: Filter logic can be tested once in the hook
5. **Future Enhancements**: New filter features automatically available everywhere
6. **Reduced Bugs**: No more discrepancies between component implementations

## Best Practices

1. **Use Descriptive Filter Keys**: `statuses` not `s`, `start_date` not `sd`
2. **Initialize All Filters**: Always provide complete initial state
3. **Avoid Direct State Mutation**: Use provided helper functions
4. **Document Custom Logic**: If wrapping `clearAllFilters`, comment why
5. **Test Edge Cases**: Empty arrays, undefined values, date boundaries

## Testing Examples

```javascript
// Test toggleFilter
toggleFilter('statuses', 'Active');
// filters.statuses => ['Active']

toggleFilter('statuses', 'Active');
// filters.statuses => [] (toggled off)

toggleFilter('statuses', 'Completed');
// filters.statuses => ['Completed']

// Test clearFilter
clearFilter('statuses');
// filters.statuses => []

// Test setFilterValue
setFilterValue('start_date', '2024-01-01');
// filters.start_date => '2024-01-01'

// Test hasActiveFilters
hasActiveFilters();
// => true (if any filter is set)
```

## Questions or Issues?

If you encounter any issues during refactoring or have suggestions for improving the hook, please document them in this guide or discuss with the team.

---

**Last Updated**: December 13, 2024
**Maintained By**: Development Team

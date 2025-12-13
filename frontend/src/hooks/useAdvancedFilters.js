import { useState, useCallback } from 'react';

/**
 * Custom hook for managing advanced filtering with multi-select and date range support
 * 
 * @param {Object} initialFilters - Initial filter state (e.g., { types: [], statuses: [], start_date: '', end_date: '' })
 * @returns {Object} - Filter state and helper functions
 */
const useAdvancedFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  /**
   * Toggle a value in a multi-select filter array
   * @param {string} filterType - The filter key (e.g., 'types', 'statuses')
   * @param {any} value - The value to toggle
   */
  const toggleFilter = useCallback((filterType, value) => {
    setFilters(prev => {
      const currentArray = prev[filterType] || [];
      const isSelected = currentArray.includes(value);
      return {
        ...prev,
        [filterType]: isSelected 
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value]
      };
    });
  }, []);

  /**
   * Clear a specific filter type (set to empty array or empty string)
   * @param {string} filterType - The filter key to clear
   */
  const clearFilter = useCallback((filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: Array.isArray(prev[filterType]) ? [] : ''
    }));
  }, []);

  /**
   * Clear date range filters
   */
  const clearDateFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      start_date: '',
      end_date: ''
    }));
  }, []);

  /**
   * Clear all filters (reset to initial state)
   */
  const clearAllFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  /**
   * Set a specific filter value directly
   * @param {string} filterType - The filter key
   * @param {any} value - The new value
   */
  const setFilterValue = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  /**
   * Update multiple filters at once
   * @param {Object} updates - Object with filter keys and values to update
   */
  const updateFilters = useCallback((updates) => {
    setFilters(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  /**
   * Check if any filters are active
   * @returns {boolean}
   */
  const hasActiveFilters = useCallback(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '' && value !== null && value !== undefined;
    });
  }, [filters]);

  return {
    filters,
    setFilters,
    toggleFilter,
    clearFilter,
    clearDateFilters,
    clearAllFilters,
    setFilterValue,
    updateFilters,
    hasActiveFilters
  };
};

export default useAdvancedFilters;

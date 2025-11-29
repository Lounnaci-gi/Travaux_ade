/**
 * Format a number with thousand separators
 * @param {number|string} value - The number to format
 * @returns {string} - The formatted number string
 */
export const formatNumberWithThousands = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check if it's a valid number
  if (isNaN(num)) {
    return value.toString();
  }
  
  // Format with thousand separators and preserve decimals
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default formatNumberWithThousands;
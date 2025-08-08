# Array-Based Data Mapping Guide

## What Changed

The GraphControls system has been updated from individual path mapping to array-based row mapping. This allows proper handling of complex JSON structures where data comes from arrays of objects.

## New Data Structure

### Before (Individual Mapping)
```json
{
  "mappings": {
    "x": "wb:countries.wb:country.0.wb:name",
    "y": "wb:countries.wb:country.0.wb:incomeLevel.content"
  }
}
```

### After (Array-Based Mapping)
```json
{
  "mappings": {
    "rowPath": "response.data.wb:countries.wb:country",
    "x": "wb:name",
    "y": "wb:incomeLevel.content"
  }
}
```

## How It Works

1. **Row Path**: Points to the array containing repeating data structures
   - Example: `response.data.wb:countries.wb:country`
   - Each item in this array becomes one row of data

2. **Field Mappings**: Relative paths within each array item
   - Example: `wb:name` (gets name from each country object)
   - Example: `wb:incomeLevel.content` (gets income level from each country)

## User Interface Changes

1. **Row Data Source Input**: New yellow-highlighted input for specifying the array path
2. **Click-Based Mapping**: Blue circles next to JSON fields open popup menus
3. **Popup Options**: 
   - "Set as Row Data Source" for arrays
   - Regular field mappings for individual fields

## Testing with Countries Data

1. **Load API Response**: Select "countries-world" from dropdown
2. **Select Graph Type**: Choose "bar-chart"
3. **Set Row Path**: 
   - Click blue circle next to "wb:country" array
   - Select "Set as Row Data Source"
   - This should populate: `response.data.wb:countries.wb:country`
4. **Map Fields**:
   - Click blue circle next to "wb:name" in any country object
   - Select "X-Axis (Category)" from popup
   - Click blue circle next to "wb:incomeLevel" → "content"
   - Select "Y-Axis (Value)" from popup
5. **Preview**: Click "Preview Mappings" to see data table
6. **Render**: Click "Render Graph" to generate visualization

## Fixed Configuration

The GraphControls.json has been updated with the correct structure:

```json
{
  "dataSource": {
    "apiResponse": "countries-world.json"
  },
  "visualization": {
    "graphType": "bar-chart",
    "mappings": {
      "rowPath": "response.data.wb:countries.wb:country",
      "x": "wb:name",
      "y": "wb:incomeLevel.content"
    }
  }
}
```

## Key Benefits

1. **Proper Array Handling**: Each array item becomes a data row
2. **Relative Paths**: Field mappings are relative to each row item
3. **Flexible Structure**: Supports deeply nested JSON structures
4. **Better Preview**: Preview table shows actual row-based data
5. **Intuitive Interface**: Click-based selection with contextual popups

## Validation Rules

- **Row Path Required**: Must specify path to array data source
- **Field Mappings**: Must provide required fields for selected graph type
- **Data Validation**: Preview shows actual resolved data

This new system properly handles the World Bank API structure where countries are in an array, and each country object contains the fields we want to visualize.

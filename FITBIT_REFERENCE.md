# Fitbit API Reference

Quick reference for common Fitbit API values needed when using this backend.

## Meal Type IDs

Used in the `mealTypeId` field when logging meals.

| ID | Meal Type |
|----|-----------|
| 1  | Breakfast |
| 2  | Morning Snack |
| 3  | Lunch |
| 4  | Afternoon Snack |
| 5  | Dinner |
| 7  | Anytime |

## Common Unit IDs

Used in the `unitId` field when creating foods or logging meals.

| ID  | Unit | Description |
|-----|------|-------------|
| 147 | serving | Generic serving |
| 180 | oz | Ounces |
| 226 | g | Grams |
| 389 | cup | Cup |
| 279 | ml | Milliliters |
| 256 | piece | Piece/item |
| 304 | scoop | Scoop |
| 999 | unit | Generic unit |

**Note**: To get the full list of available units, call `GET /units` with your API key. The backend proxies this directly from Fitbit.

```bash
curl -X GET http://localhost:3000/units \
  -H "X-API-Key: your_api_key_here" | jq '.'
```

## Date Format

All dates must be in `YYYY-MM-DD` format (ISO 8601).

Examples:
- `2026-01-08`
- `2025-12-25`
- `2026-02-14`

## Canonical Name Normalization

When you provide a `canonicalName`, the backend automatically normalizes it:
- Trims leading/trailing whitespace
- Converts to lowercase
- Collapses multiple spaces to single space

Examples:
- `"  Protein  Shake  "` → `"protein shake"`
- `"BANANA"` → `"banana"`
- `"Greek   Yogurt"` → `"greek yogurt"`

This ensures consistent food lookups regardless of input formatting.

## Fitbit API Endpoints Used

This backend uses the following Fitbit API endpoints:

### OAuth 2.0
- **Authorization**: `https://www.fitbit.com/oauth2/authorize`
- **Token Exchange**: `https://api.fitbit.com/oauth2/token`

### Food APIs
- **Create Food**: `POST https://api.fitbit.com/1/foods.json`
- **Log Food**: `POST https://api.fitbit.com/1/user/-/foods/log.json`
- **Get Units**: `GET https://api.fitbit.com/1/foods/units.json`

## Required OAuth Scopes

When setting up your Fitbit app, ensure these scopes are included:
- `nutrition` - Required for creating and logging foods
- `profile` - Required for user identification

## Error Codes

### From This Backend

| Code | Error | Meaning |
|------|-------|---------|
| 400 | VALIDATION_ERROR | Missing or invalid required fields |
| 401 | UNAUTHORIZED | Missing or invalid API key |
| 409 | CONFLICT | Resource already exists or idempotency key reused |
| 502 | FITBIT_UPSTREAM_ERROR | Fitbit API returned an error |

### Common Fitbit Errors (502 responses)

When Fitbit returns an error, you'll get a 502 response with the Fitbit error details:

```json
{
  "error": "FITBIT_UPSTREAM_ERROR",
  "status": 400,
  "body": "{\"errors\":[{\"errorType\":\"validation\",\"fieldName\":\"foodId\",\"message\":\"Invalid food id\"}]}"
}
```

Common Fitbit error scenarios:
- Invalid `foodId` - Food doesn't exist in Fitbit
- Invalid `unitId` - Unit doesn't exist or not compatible with food
- Invalid `date` - Date format wrong or out of range
- Invalid `mealTypeId` - Meal type ID doesn't exist
- Rate limit exceeded - Too many requests to Fitbit

## Example: Complete Meal Logging Flow

### 1. Create a custom food
```bash
curl -X POST http://localhost:3000/foods \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalName": "my protein bar",
    "displayName": "My Protein Bar",
    "defaultUnitId": 147,
    "defaultAmount": 1,
    "calories": 200,
    "protein_g": 20,
    "carbs_g": 15,
    "fat_g": 8
  }'
```

Response:
```json
{
  "canonicalName": "my protein bar",
  "fitbitFoodId": 123456789,
  "defaultUnitId": 147,
  "defaultAmount": 1
}
```

### 2. Log the food as a meal
```bash
curl -X POST http://localhost:3000/meals/log \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-01-08",
    "mealTypeId": 7,
    "items": [
      {
        "canonicalName": "my protein bar",
        "amount": 1,
        "unitId": 147
      }
    ]
  }'
```

Response:
```json
{
  "success": true,
  "logged": [
    {
      "foodId": 123456789,
      "amount": 1,
      "unitId": 147,
      "fitbitLogId": 987654321
    }
  ]
}
```

## Tips for Custom GPT Integration

When building your Custom GPT Action:

1. **Always provide exact values**: Never let the GPT guess `unitId` or `mealTypeId`
2. **Use canonical names consistently**: Train the GPT to normalize food names
3. **Handle missing foods gracefully**: If a food isn't registered, the GPT should create it first
4. **Implement conversions**: The GPT should convert "200g chicken" to the proper format
5. **Use idempotency keys**: For meal logging, generate unique keys to prevent duplicates

Example GPT instruction:
```
When a user wants to log a meal:
1. Extract all food items, portions, and units
2. Look up each food in the registry (GET /foods)
3. If a food doesn't exist, create it first (POST /foods)
4. Convert all portions to amounts + unitIds
5. Log the meal with all exact values (POST /meals/log)
6. Always use ISO date format (YYYY-MM-DD)
7. Default to mealTypeId=7 (Anytime) unless specified
```

## Rate Limits

Fitbit API rate limits:
- 150 requests per hour per user (default)
- Refresh tokens are valid for 8 hours
- Access tokens expire after 8 hours

This backend automatically refreshes tokens before they expire.

## Security Best Practices

1. **Never expose API key**: Keep `X-API-Key` secret
2. **Never expose Fitbit tokens**: Tokens stay in the database
3. **Use HTTPS in production**: Update `BASE_URL` to use `https://`
4. **Rotate API key regularly**: Change the `API_KEY` in `.env` periodically
5. **Restrict API access**: Only allow your Custom GPT to call the API

## Debugging Tips

### Enable verbose Fitbit errors
When you get a 502 error, the `body` field contains the full Fitbit error response. Parse it to understand what went wrong.

### Check the logs table
The backend stores all meal logs in the `logs` table:
```bash
sqlite3 app.db "SELECT * FROM logs ORDER BY created_at DESC LIMIT 10;"
```

### Check stored foods
```bash
sqlite3 app.db "SELECT canonical_name, fitbit_food_id, display_name FROM foods;"
```

### Check token expiry
```bash
sqlite3 app.db "SELECT datetime(expires_at, 'unixepoch') as expires FROM tokens;"
```

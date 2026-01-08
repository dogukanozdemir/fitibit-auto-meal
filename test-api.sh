#!/bin/bash

if [ -z "$API_KEY" ]; then
    echo "Error: API_KEY environment variable not set"
    echo "Usage: API_KEY=your_key_here ./test-api.sh"
    exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Testing Fitbit Meal Logger API"
echo "================================"
echo ""

echo "1. Health Check (no auth)"
curl -s "$BASE_URL/health" | jq '.'
echo ""

echo "2. List Foods"
curl -s "$BASE_URL/foods" \
  -H "X-API-Key: $API_KEY" | jq '.'
echo ""

echo "3. Create Custom Food"
curl -s -X POST "$BASE_URL/foods" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "canonicalName": "test protein bar",
    "displayName": "Test Protein Bar",
    "defaultUnitId": 147,
    "defaultAmount": 1,
    "calories": 200,
    "protein_g": 20,
    "carbs_g": 15,
    "fat_g": 8
  }' | jq '.'
echo ""

echo "4. List Foods Again (should show the new food)"
curl -s "$BASE_URL/foods" \
  -H "X-API-Key: $API_KEY" | jq '.'
echo ""

echo "5. Log a Meal"
TODAY=$(date +%Y-%m-%d)
curl -s -X POST "$BASE_URL/meals/log" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$TODAY\",
    \"mealTypeId\": 7,
    \"items\": [
      {
        \"canonicalName\": \"test protein bar\",
        \"amount\": 1,
        \"unitId\": 147
      }
    ]
  }" | jq '.'
echo ""

echo "Tests complete!"

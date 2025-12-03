# Comprehensive Caching Implementation

## Overview
Implemented a comprehensive caching system to significantly improve page load times across all tabs (Participants, Expenses, Settlements).

## Architecture

### Cache Storage
- **DataCache Sheet**: Stores general data (participants, expenses)
  - Columns: Cache Key | Timestamp | JSON Data
- **SettlementCache Sheet**: Stores settlement calculations
  - Columns: Calculated At | Settlements JSON | Expense Count

### Cache Configuration
- **Expiration Time**: 5 minutes (configurable via `CACHE_EXPIRATION_MINUTES`)
- **Cache Keys**:
  - `participants` - All participants data
  - `expenses_admin` - Admin view of expenses (all statuses)
  - `expenses_user` - User view of expenses (approved only)
  - Settlement cache (stored in SettlementCache sheet)

## Core Functions

### getCachedData(sheet, cacheKey)
- Retrieves cached data if less than 5 minutes old
- Returns: `{data, age, cached: true}` or `null`

### setCachedData(sheet, cacheKey, data)
- Updates or creates cache entry
- Stores timestamp and JSON serialized data

### invalidateCache(sheet, cacheKey)
- Removes cache entry by cache key
- Called after any data mutation

### refreshAllCaches()
- Proactively refreshes all caches
- Can be called manually or via time-driven trigger
- Refreshes: participants, expenses_admin, expenses_user, settlements

## Data Extraction Pattern

For caching to work, data retrieval functions are split into two parts:

1. **Data Extraction Function** (e.g., `getParticipantsData(sheet)`)
   - Contains the actual data retrieval logic
   - Returns raw data array
   - No caching logic

2. **Cache-Aware Wrapper** (e.g., `getParticipants(sheet)`)
   - Checks cache first via `getCachedData()`
   - If cache miss, calls data extraction function
   - Stores result via `setCachedData()`
   - Returns data with cache metadata

## Cache Invalidation

Caches are invalidated immediately after any mutation operation:

### Participant Mutations
- `addParticipant()` → Invalidates `participants` cache
- `removeParticipant()` → Invalidates `participants` cache

### Expense Mutations
All expense operations invalidate both admin and user expense caches:
- `addExpense()` → Invalidates `expenses_admin` and `expenses_user`
- `updateExpense()` → Invalidates `expenses_admin` and `expenses_user`
- `approveExpense()` → Invalidates `expenses_admin` and `expenses_user`
- `rejectExpense()` → Invalidates `expenses_admin` and `expenses_user`

### Settlement Mutations
- `confirmSettlement()` → Invalidates settlement cache (existing implementation)

## Benefits

1. **Faster Load Times**: Data retrieved in milliseconds instead of seconds
2. **Reduced Computation**: Complex calculations cached for 5 minutes
3. **Separate Admin/User Caches**: Optimized cache keys for different views
4. **Proactive Refresh**: `refreshAllCaches()` can be triggered on schedule
5. **Automatic Invalidation**: Caches cleared immediately on data changes
6. **Cache Transparency**: Response includes cache age indicator

## Performance Expectations

- **Cache Hit**: Sub-second response times
- **Cache Miss**: Normal computation time, then cached for 5 minutes
- **Cache Invalidation**: Instant, ensures data consistency
- **Tab Switching**: Near-instant with cached data

## Automatic Cache Refresh

### Time-Driven Trigger
The app includes built-in trigger management accessible from the admin page:

1. **Enable Auto-Refresh**: Activates a time-based trigger that refreshes all caches every 5 minutes
2. **Disable Auto-Refresh**: Removes the trigger (caches only update on data changes)
3. **Refresh Now**: Manually triggers an immediate cache refresh

### Management Functions
- `setupCacheRefreshTrigger()`: Creates trigger for 5-minute intervals
- `deleteCacheRefreshTrigger()`: Removes the automatic refresh trigger
- `getCacheRefreshTriggerStatus()`: Checks if auto-refresh is enabled

### How It Works
When enabled, the trigger calls `refreshAllCaches()` every 5 minutes, ensuring:
- Caches stay warm even without user activity
- Data is always fresh (≤ 5 minutes old)
- Fast loading for all users
- Background synchronization without manual intervention

**Note**: Google Apps Script allows trigger intervals of 1, 5, 10, 15, or 30 minutes. We use 5 minutes to match the cache expiration time.

## Testing Recommendations

1. **Cache Hit Test**: Load a tab twice quickly, verify faster second load
2. **Cache Invalidation Test**: Add/edit expense, verify changes appear immediately
3. **Cache Expiration Test**: Wait 5+ minutes, verify data refreshes
4. **Cross-Tab Test**: Verify cache keys work independently for admin/user views

## Technical Notes

- Cache stored as JSON strings in Google Sheets cells
- Cache age returned in minutes (1 decimal place)
- Empty caches don't cause errors (null check in place)
- Multiple cache keys supported via single DataCache sheet
- Settlement cache uses separate sheet for historical reasons

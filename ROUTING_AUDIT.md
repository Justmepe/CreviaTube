# ROUTING SYSTEM AUDIT - CreoCash Platform

## CURRENT STATE (BROKEN)

### Active Routing System
- **Primary**: `backend/index.ts` → `setupAPIs()` → `backend/api/index.ts`
- **Unused**: `backend/core/routes.ts` (modular system - NOT loaded)
- **Conflicting**: `backend/routes.ts` (legacy routes - NOT loaded but causes conflicts)

### Critical Routing Conflicts
```
/api/campaigns - 16+ duplicate route definitions across files:
- backend/api/campaigns/index.ts (ACTIVE - correct)
- backend/routes.ts (INACTIVE but conflicting)
- backend/core/routes.ts (INACTIVE)
```

### Frontend API Calls Status
- ✅ Most frontend API calls are correctly structured
- ❌ Some endpoints missing on backend (causing 404s)
- ❌ Query keys don't match actual backend endpoints

## RECOMMENDED FIX STRATEGY

1. **Clean up legacy files** - Remove unused route definitions
2. **Complete the API system** - Add missing endpoints in active api/ folder
3. **Fix frontend mismatches** - Update frontend to match active backend routes
4. **Test all critical paths** - Verify campaigns, auth, payments work

## FILES TO FIX
- Remove duplicates from `backend/routes.ts`
- Complete missing endpoints in `backend/api/*/index.ts` files
- Update frontend components with mismatched API calls
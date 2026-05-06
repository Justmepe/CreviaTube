# Daily Testing Checklist - CreviaTube Platform

## Quick Reference: Test Accounts Available
```
✅ Existing Test Users:
- Clippers: testclipper@test.com, testclipper2025@clipper2025.com  
- Creators: testcreator@test.com, testtrader@test.com
- Enterprise: creofashion@test.com (TechStartup Inc - Active White-Label)
- Admin: admin@creviatube.com (existing admin account)

✅ Current System Stats:
- Total Campaigns: 14 (4 active, 1 completed)
- Total Budget: $71,609 across all campaigns
- Recent Events: 8 tracking events (clicks, signups, views)
- White-Label Active: TechStartup Inc (15% commission)
```

---

## Day 1: Authentication & Dashboard ✅

### Morning Session (2-3 hours)
**Authentication Testing:**
- [ ] Login as clipper → Check clipper dashboard loads
- [ ] Login as enterprise → Check enterprise dashboard with white-label branding  
- [ ] Login as admin → Check admin dashboard with global stats
- [ ] Test logout and session management
- [ ] Verify role-based redirects work correctly

**Quick Test URLs:**
- Main Dashboard: `http://localhost:5000/`
- Enterprise Dashboard: `http://localhost:5000/` (when logged in as enterprise)
- Admin Panel: `http://localhost:5000/admin`

### Afternoon Session (2-3 hours)
**Dashboard Metrics Testing:**
- [ ] **Clipper Dashboard**: Check earnings display, active campaigns (should show campaigns they joined)
- [ ] **Enterprise Dashboard**: Verify TechStartup Inc shows "TechStartup Inc Platform" header
- [ ] **Admin Dashboard**: Confirm shows 14 total campaigns, 4 active campaigns
- [ ] **Real-Time Data**: Refresh and verify numbers match database

**Success Criteria:**
- [ ] All dashboards load without errors
- [ ] Data matches database queries
- [ ] White-label branding appears for enterprise users
- [ ] No authentication bypasses possible

---

## Day 2: Campaign Management ✅

### Morning Session (3-4 hours)
**Campaign Creation Testing:**
- [ ] Create new trading campaign (test budget escrow)
- [ ] Create influencer campaign (test social goals)
- [ ] Create business campaign (test conversion tracking)
- [ ] Test campaign as enterprise user (verify custom commission rate)

**Campaign Management:**
- [ ] Edit existing campaigns (budget, goals, status)  
- [ ] Test campaign approval workflow
- [ ] Verify campaign analytics show correct data
- [ ] Check campaign appears in "My Campaigns" for creator

### Afternoon Session (2-3 hours)
**Campaign Analytics:**
- [ ] View campaign performance metrics
- [ ] Test real-time updates when events occur
- [ ] Verify budget tracking and escrow calculations
- [ ] Check clipper application management

---

## Day 3: Clipper Features ✅

### Morning Session (2-3 hours)
**Clipper Directory:**
- [ ] Browse clipper profiles and ratings
- [ ] Test search and filter functionality
- [ ] View clipper statistics and portfolios
- [ ] Test clipper profile editing

### Afternoon Session (3-4 hours)
**Clipper Campaign Participation:**
- [ ] Browse available campaigns
- [ ] Apply to campaigns (test approval process)
- [ ] Generate tracking links for approved campaigns
- [ ] Test tracking link functionality (click, view events)
- [ ] Monitor goal progress in real-time

---

## Day 4: Tracking & Analytics ✅

### Morning Session (3-4 hours)
**Event Tracking System:**
- [ ] Test click tracking on generated links
- [ ] Test view event recording
- [ ] Test signup event tracking (if signup forms available)
- [ ] Test deposit/trade event recording
- [ ] Verify conversion event triggers

**Validation Steps:**
- [ ] Check events appear in database immediately
- [ ] Verify clipper gets proper credit for events
- [ ] Test bot detection doesn't block legitimate events
- [ ] Confirm dashboard updates in real-time

### Afternoon Session (2-3 hours)
**Analytics Dashboard:**
- [ ] View performance charts and metrics
- [ ] Test different time range filters
- [ ] Verify conversion rate calculations
- [ ] Test data export functionality

---

## Day 5: Payout System ✅

### Morning Session (3-4 hours)
**Payout Calculations:**
- [ ] Verify 20% platform / 80% clipper split calculations
- [ ] Test enterprise custom rate (15% for TechStartup Inc)
- [ ] Test goal-based automatic payout triggers
- [ ] Check escrow balance updates

### Afternoon Session (2-3 hours)
**Payment Processing:**
- [ ] Test manual payout initiation (admin)
- [ ] Verify payout records are created properly
- [ ] Check user notifications for payouts
- [ ] Test payout history display

**Note:** Payment gateway testing requires API keys - document which payments need real credentials vs. which can be tested in sandbox mode.

---

## Day 6: Enterprise & White-Label ✅

### Morning Session (3-4 hours)
**Enterprise Features:**
- [ ] Test enterprise request submission
- [ ] Test admin approval process using new API endpoint
- [ ] Verify automatic white-label activation
- [ ] Test custom domain assignment (techstartup-inc.creviatube.com)

### Afternoon Session (2-3 hours)
**White-Label Experience:**
- [ ] Login as TechStartup Inc enterprise user
- [ ] Verify custom branding: "TechStartup Inc Platform" header
- [ ] Check scoped analytics (only their data)
- [ ] Test custom commission rate application (15%)
- [ ] Verify enterprise-specific campaign creation

---

## Day 7: Admin & Integration ✅

### Morning Session (3-4 hours)
**Admin Panel:**
- [ ] User management (view, edit, role changes)
- [ ] Enterprise request management
- [ ] Campaign oversight and intervention
- [ ] Payout administration

### Afternoon Session (3-4 hours)
**System Integration:**
- [ ] Test all API endpoints respond correctly
- [ ] Verify database performance under load
- [ ] Test error handling and recovery
- [ ] Complete end-to-end user journey testing

---

## Testing Shortcuts & Commands

### Quick Database Checks
```sql
-- Check user counts
SELECT user_type, COUNT(*) FROM users GROUP BY user_type;

-- Check active campaigns  
SELECT status, COUNT(*) FROM campaigns GROUP BY status;

-- Check recent tracking events
SELECT event_type, COUNT(*) FROM tracking_events 
WHERE created_at > NOW() - INTERVAL '1 day' 
GROUP BY event_type;

-- Check enterprise accounts
SELECT company_name, status, custom_domain FROM enterprise_accounts;
```

### API Testing Commands
```bash
# Test authentication
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testclipper@test.com", "password": "password123"}'

# Test platform stats
curl -X GET http://localhost:5000/api/platform/stats

# Test enterprise stats (need auth)
curl -X GET http://localhost:5000/api/enterprise/platform-stats \
  --cookie "session-cookie-here"
```

### Browser Testing Checklist
- [ ] Test in Chrome (primary)
- [ ] Test in Firefox  
- [ ] Test on mobile/responsive design
- [ ] Check browser console for errors
- [ ] Verify all JavaScript loads correctly

### Performance Monitoring
- [ ] Page load times under 3 seconds
- [ ] API responses under 1 second
- [ ] Database queries optimized
- [ ] No memory leaks during extended use
- [ ] Real-time updates work smoothly

### Bug Severity Levels
- **Critical**: App crashes, security issues, data loss
- **High**: Major features broken, wrong calculations  
- **Medium**: UI issues, minor feature problems
- **Low**: Cosmetic issues, nice-to-have improvements

### Daily Sign-off Checklist
- [ ] All planned tests completed
- [ ] Bugs documented with reproduction steps
- [ ] Test data cleaned up or preserved for next day
- [ ] Notes updated for next day's focus
- [ ] Any blocking issues escalated

This simplified checklist makes it easy to track daily progress while ensuring comprehensive coverage of all platform features!
# KidQuest - Deployment Guide

## Overview
KidQuest is a full-stack mobile application built with:
- **Frontend:** Expo (React Native) - iOS, Android, Web
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **AI:** Emergent LLM integration for task suggestions

---

## 📱 App Store Deployment

### Prerequisites
1. **Apple Developer Account** ($99/year) - https://developer.apple.com
2. **Google Play Console** ($25 one-time) - https://play.google.com/console
3. **EAS CLI** - Expo Application Services

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
cd /app/frontend
eas login
```

### Step 3: Configure Project
```bash
eas build:configure
```

This will create `eas.json`. Update it:
```json
{
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.kidquest.app",
        "buildNumber": "1.0.0"
      },
      "android": {
        "package": "com.kidquest.app",
        "versionCode": 1
      }
    }
  }
}
```

### Step 4: Build for iOS
```bash
# Build for iOS
eas build --platform ios --profile production

# After build completes, submit to App Store
eas submit --platform ios
```

**iOS App Store Requirements:**
- App name: KidQuest
- Subtitle: Daily Tasks. Epic Rewards
- Category: Education / Family
- Age Rating: 4+
- Privacy Policy URL (required for children's apps)
- Screenshots: 6.7", 6.5", 5.5" iPhones + iPad Pro
- App Preview Video (optional but recommended)

### Step 5: Build for Android
```bash
# Build AAB for Google Play
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

**Google Play Requirements:**
- App name: KidQuest  
- Short description: Family task management with gamification
- Full description: (see marketing copy below)
- Category: Education
- Content Rating: Everyone
- Screenshots: Phone, 7" Tablet, 10" Tablet
- Feature Graphic: 1024x500px

---

## 🌐 Web Deployment

### Option 1: Static Hosting (Vercel/Netlify)
```bash
cd /app/frontend
npx expo export:web

# Deploy to Vercel
vercel deploy

# Or Netlify
netlify deploy --prod
```

### Option 2: Emergent Native Deployment
The frontend is already configured to work with Emergent's preview system.
Simply push your changes and it will be live at:
```
https://family-quest-15.preview.emergentagent.com
```

---

## 🔧 Backend Deployment

### Option 1: Railway
1. Create account at https://railway.app
2. New Project → Deploy from GitHub
3. Add MongoDB plugin
4. Set environment variables:
   ```
   MONGO_URL=mongodb://mongo:27017
   DB_NAME=kidquest_db
   JWT_SECRET=your-secret-key-here
   EMERGENT_LLM_KEY=sk-emergent-a88015b1f4f0eF9562
   ```
5. Deploy!

### Option 2: Render
1. Create account at https://render.com
2. New Web Service → Connect Repository
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add MongoDB (use MongoDB Atlas free tier)
6. Set environment variables

### Option 3: AWS/Google Cloud
- Use EC2/Compute Engine for backend
- MongoDB Atlas for database
- Configure security groups for port 8001
- Use nginx as reverse proxy

---

## 📝 App Store Listing Content

### App Name
**KidQuest**

### Tagline
Daily tasks. Epic rewards. Family fun.

### Description (iOS)
Turn everyday routines into joyful quests! KidQuest motivates children to build positive habits through gamification.

**Features:**
⭐ Points & Rewards System - Children earn points for completing daily tasks
🏆 8 Trophies & Achievements - Celebrate milestones with unlockable trophies
🎨 6 Beautiful Themes - Football, Space, Ocean, Nature, Gaming, Adventure
📊 Progress Tracking - Streaks, levels, and stats to stay motivated
👨‍👩‍👧 Family Sharing - Grandparents and relatives can send encouragement
🌴 Vacation Mode - Switch tasks for holidays automatically
✨ AI Task Suggestions - Get personalized task ideas for your child
🔒 Parent Dashboard - Full control with PIN protection

**Perfect for:**
- Parents wanting to reduce nagging about chores
- Families building positive daily routines
- Children aged 4-16 who love games and rewards

**Privacy & Safety:**
- COPPA compliant
- No ads, no in-app purchases
- Family data is secure and private

### Keywords (iOS - max 100 characters)
kids,chores,tasks,family,rewards,gamification,children,habits,routine,parenting

### Keywords (Android - up to 50)
Similar to iOS

### Privacy Policy URL
(You'll need to host this - template provided below)

### Support URL
Your website or email

---

## 🔐 Privacy Policy Template

Create a simple privacy policy and host it (use GitHub Pages, Notion, or your website):

```markdown
# KidQuest Privacy Policy

Last updated: [Date]

## Data We Collect
- Parent email address (for account creation)
- Family name and child names (you provide)
- Task completion data
- Points and progress

## How We Use Data
- To provide the KidQuest service
- To sync data across your family's devices
- To generate AI-powered task suggestions

## Data Storage
- All data is stored securely in MongoDB
- We never sell your data
- You can delete your account anytime

## Children's Privacy (COPPA Compliance)
- We do not collect personal information from children
- Children access the app through family codes
- Parents have full control over all data

## Contact
Email: [your-email]
```

---

## 📱 Screenshots Guide

### Required Sizes
**iOS:**
- iPhone 6.7" (1290x2796) - iPhone 14 Pro Max
- iPhone 6.5" (1242x2688) - iPhone 11 Pro Max  
- iPhone 5.5" (1242x2208) - iPhone 8 Plus
- iPad Pro 12.9" (2048x2732)

**Android:**
- Phone: 1080x1920 minimum
- 7" Tablet: 1024x600
- 10" Tablet: 1920x1200

### Screenshot Ideas
1. Welcome screen with tagline
2. Child home screen showing points & level
3. Daily tasks screen with confetti
4. Trophy screen
5. Reward shop
6. Parent dashboard
7. Theme selector
8. Family code sharing

---

## 🚀 Post-Launch Checklist

### Week 1
- [ ] Monitor crash reports (use Sentry or Bugsnag)
- [ ] Respond to initial reviews
- [ ] Check analytics (Expo Analytics or Firebase)
- [ ] Fix critical bugs

### Month 1
- [ ] Gather user feedback
- [ ] Plan v1.1 features
- [ ] Update screenshots based on user behavior
- [ ] A/B test app store listing

### Ongoing
- [ ] Weekly analytics review
- [ ] Monthly feature updates
- [ ] Respond to all reviews within 24-48 hours
- [ ] Monitor AI API costs (Emergent LLM usage)

---

## 💰 Monetization Options (Future)

Current version is free. Future options:
1. **Freemium** - Limit to 2 children, unlock unlimited for $2.99/month
2. **Premium Features** - Advanced analytics, custom trophies ($4.99/month)
3. **One-Time Purchase** - $9.99 lifetime access
4. **Family Plan** - $19.99/year for up to 10 children

---

## 🆘 Common Issues

### Build Fails on EAS
- Check `app.json` syntax
- Ensure all dependencies are in package.json
- Verify bundle ID doesn't conflict with existing apps

### App Rejected by Apple
- Most common: Missing privacy policy
- Solution: Add privacy policy URL in App Store Connect
- Ensure NSCameraUsageDescription is clear and under 10 words

### Android Build Issues
- Check `android.permissions` in app.json
- Verify package name format (lowercase, dots)
- Update versionCode for each release

---

## 📞 Support Resources

- **Expo Documentation:** https://docs.expo.dev
- **EAS Build Guide:** https://docs.expo.dev/build/introduction/
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies:** https://play.google.com/console/about/guides/

---

## 🎯 Next Steps

1. Complete remaining frontend screens (see ROADMAP.md)
2. Set up error tracking (Sentry)
3. Add analytics (Expo Analytics or Mixpanel)
4. Create privacy policy page
5. Design app icons & screenshots
6. Submit to App Store & Google Play!

---

**Good luck with your launch! 🚀**

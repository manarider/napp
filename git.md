# 📦 Git Configuration & Deployment Guide

## 🎯 GitHub Repository

**URL:** https://github.com/manarider/napp.git  
**Branch:** main  
**Project:** Meeting Room Booking System

---

## 🔧 การตั้งค่า Git เบื้องต้น

### 1. ตั้งค่า Git Config (ครั้งแรก)

```bash
# ตั้งค่าชื่อและอีเมล
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# ตรวจสอบการตั้งค่า
git config --list
```

### 2. เริ่มต้น Git Repository

```bash
cd /home/napp

# สร้าง git repository
git init

# เพิ่ม remote repository
git remote add origin https://github.com/manarider/napp.git

# ตรวจสอบ remote
git remote -v
```

---

## 📤 ขั้นตอนการ Push ครั้งแรก

### 1. ตรวจสอบไฟล์

```bash
# ดูสถานะไฟล์
git status

# ดูไฟล์ที่จะ ignore
cat .gitignore
```

### 2. เพิ่มไฟล์เข้า Git

```bash
# เพิ่มทุกไฟล์ (ยกเว้นใน .gitignore)
git add .

# หรือเพิ่มแค่โฟลเดอร์ที่ต้องการ
git add meeting-room-booking-backend/
git add meeting-room-booking-frontend/
git add README.md
git add progress.md
git add git.md
```

### 3. Commit การเปลี่ยนแปลง

```bash
# Commit พร้อม message
git commit -m "Initial commit: Meeting Room Booking System v1.0"

# หรือ commit แบบละเอียด
git commit -m "feat: Initial release
- Backend API with Express and MongoDB
- Frontend with React 19
- Authentication and authorization
- Booking management
- Admin dashboard
- Security improvements
- Performance optimizations
"
```

### 4. Push ขึ้น GitHub

```bash
# Push ครั้งแรก
git push -u origin main

# หรือถ้า branch ชื่อ master
git push -u origin master
```

**หมายเหตุ:** ถ้า GitHub ใช้ branch `main` แต่ local ของคุณเป็น `master` ให้เปลี่ยน:

```bash
# เปลี่ยนชื่อ branch
git branch -M main

# Push
git push -u origin main
```

---

## 🔐 การตั้งค่า Authentication

### วิธีที่ 1: Personal Access Token (แนะนำ)

1. ไปที่ GitHub → Settings → Developer settings → Personal access tokens
2. สร้าง token ใหม่ (repo access)
3. Copy token

```bash
# ใช้ token แทน password เมื่อ push
git push
Username: <your-github-username>
Password: <paste-your-token-here>
```

### วิธีที่ 2: SSH Key

```bash
# สร้าง SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# เพิ่ม public key ไปที่ GitHub → Settings → SSH keys

# เปลี่ยน remote URL เป็น SSH
git remote set-url origin git@github.com:manarider/napp.git
```

---

## 🔄 การอัปเดตโค้ด (Update)

### 1. ตรวจสอบการเปลี่ยนแปลง

```bash
# ดูไฟล์ที่เปลี่ยน
git status

# ดูความแตกต่างของไฟล์
git diff

# ดูความแตกต่างของไฟล์ที่ staged
git diff --staged
```

### 2. เพิ่มและ Commit

```bash
# เพิ่มไฟล์ทีละไฟล์
git add <filename>

# หรือเพิ่มทุกไฟล์
git add .

# Commit
git commit -m "feat: Add new feature"
```

### 3. Push การเปลี่ยนแปลง

```bash
# Push ปกติ
git push

# Force push (ระวัง! จะเขียนทับ remote)
git push -f
```

---

## 📝 Commit Message Convention

ใช้ Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### ประเภท (Types)

- `feat`: คุณสมบัติใหม่
- `fix`: แก้ไข bug
- `docs`: เอกสาร
- `style`: รูปแบบโค้ด (formatting)
- `refactor`: ปรับปรุงโค้ด
- `perf`: ปรับปรุงประสิทธิภาพ
- `test`: เพิ่ม test
- `chore`: งานอื่นๆ

### ตัวอย่าง

```bash
# Feature
git commit -m "feat(booking): Add multi-day booking support"

# Bug fix
git commit -m "fix(auth): Fix login redirect issue"

# Documentation
git commit -m "docs: Update README with deployment guide"

# Performance
git commit -m "perf(booking): Add database indexes for faster queries"

# Security
git commit -m "security: Implement rate limiting on login endpoint"
```

---

## 🌿 Branch Strategy

### Main Branches

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches

### การใช้งาน

```bash
# สร้าง branch ใหม่
git checkout -b feature/new-feature

# ทำงานและ commit
git add .
git commit -m "feat: Add new feature"

# Push branch ใหม่
git push -u origin feature/new-feature

# Merge กลับไป main
git checkout main
git merge feature/new-feature
git push

# ลบ branch (local)
git branch -d feature/new-feature

# ลบ branch (remote)
git push origin --delete feature/new-feature
```

---

## 🔙 การย้อนกลับ (Rollback)

### Undo Changes

```bash
# Undo ไฟล์ที่ยังไม่ add
git checkout -- <filename>

# Undo ทุกอย่าง
git checkout -- .

# Undo staged files
git reset HEAD <filename>

# Undo last commit (แต่เก็บไฟล์)
git reset --soft HEAD~1

# Undo last commit (และลบไฟล์)
git reset --hard HEAD~1
```

### Revert Commit

```bash
# Revert commit ล่าสุด
git revert HEAD

# Revert commit เฉพาะ
git revert <commit-hash>
```

---

## 📋 คำสั่งที่ใช้บ่อย

### ดูประวัติ

```bash
# ดู commit log
git log

# ดูแบบสั้น
git log --oneline

# ดูกราฟ
git log --graph --oneline --all

# ดู log ของไฟล์
git log <filename>
```

### Stash (เก็บงานชั่วคราว)

```bash
# เก็บการเปลี่ยนแปลงชั่วคราว
git stash

# ดู stash list
git stash list

# นำ stash กลับมา
git stash pop

# ลบ stash
git stash drop
```

### Pull & Fetch

```bash
# Pull (fetch + merge)
git pull

# Fetch only
git fetch

# Pull specific branch
git pull origin main
```

---

## 📦 สร้าง Release

### 1. Tag Version

```bash
# สร้าง tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0

# Push all tags
git push origin --tags

# ดู tags
git tag
```

### 2. Create Release on GitHub

1. ไปที่ GitHub repository
2. Releases → Create new release
3. เลือก tag v1.0.0
4. เขียน release notes
5. Publish release

---

## 🚨 แก้ปัญหาที่พบบ่อย

### 1. Merge Conflict

```bash
# เมื่อเกิด conflict
git status  # ดูไฟล์ที่ conflict

# แก้ไขไฟล์ที่ conflict
# ลบ markers: <<<<<<<, =======, >>>>>>>

# เพิ่มไฟล์ที่แก้แล้ว
git add <conflicted-file>

# Commit
git commit -m "fix: Resolve merge conflict"
```

### 2. รหัสผ่านไม่ถูกต้อง

```bash
# ล้าง credentials
git config --global --unset credential.helper

# หรือใช้ SSH แทน
git remote set-url origin git@github.com:manarider/napp.git
```

### 3. ต้องการ force push

```bash
# ระวัง! จะเขียนทับ remote
git push --force

# ปลอดภัยกว่า (ไม่เขียนทับถ้ามีคนอื่น push)
git push --force-with-lease
```

---

## 📊 Git Workflow สำหรับทีม

### 1. Clone Repository

```bash
git clone https://github.com/manarider/napp.git
cd napp
```

### 2. สร้าง Feature Branch

```bash
git checkout -b feature/your-feature
```

### 3. ทำงานและ Commit

```bash
git add .
git commit -m "feat: Your feature description"
```

### 4. Pull ล่าสุดจาก main

```bash
git checkout main
git pull
git checkout feature/your-feature
git rebase main
```

### 5. Push Branch

```bash
git push -u origin feature/your-feature
```

### 6. สร้าง Pull Request

1. ไปที่ GitHub
2. สร้าง Pull Request
3. รอ review
4. Merge

---

## ✅ Checklist ก่อน Push

- [ ] ทดสอบโค้ดให้แน่ใจว่าทำงานได้
- [ ] ลบ console.log ที่ไม่จำเป็น
- [ ] อัปเดต .gitignore (ไม่ commit .env)
- [ ] เขียน commit message ที่ชัดเจน
- [ ] ตรวจสอบไฟล์ที่จะ commit (git status)
- [ ] รันทดสอบ (npm test)
- [ ] Build production (npm run build)
- [ ] ตรวจสอบ dependencies (npm audit)

---

## 📚 Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Cheat Sheet](https://training.github.com/downloads/github-git-cheat-sheet.pdf)

---

## 🎓 คำแนะนำเพิ่มเติม

1. **Commit บ่อยๆ** - แต่ละ commit ควรทำงานเฉพาะอย่าง
2. **เขียน commit message ที่ดี** - อธิบายว่าทำอะไรและทำไม
3. **ใช้ branches** - แยกการทำงานแต่ละ feature
4. **Pull ก่อน Push** - เพื่อหลีกเลี่ยง conflict
5. **Review โค้ด** - ก่อน merge เข้า main
6. **ใช้ .gitignore** - ไม่ commit ไฟล์ที่ไม่จำเป็น
7. **Tag releases** - สำหรับเวอร์ชันที่สำคัญ
8. **Write documentation** - README, CHANGELOG

---

**Last Updated:** 27 April 2026  
**Maintained by:** NSM Development Team

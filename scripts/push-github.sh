#!/usr/bin/env bash
# پوش امن به GitHub — همیشه یک اسنپ‌شات تمیز تک‌کامیتی (بدون فایل‌های حساس و بدون تاریخچه قدیمی)
# استفاده:
#   GITHUB_TOKEN=ghp_xxxx bash scripts/push-github.sh "پیام اختیاری"
# توکن را هرگز داخل فایل ننویس — فقط از متغیر محیطی بده.
set -e
cd "$(dirname "$0")/.."
REPO="tahaheidari2212-create/foroshgan-mobile.git"
: "${GITHUB_TOKEN:?توکن را این‌طور بده: GITHUB_TOKEN=ghp_xxx bash scripts/push-github.sh}"

# مهم: اول همهٔ فایل‌های untracked را روی main کامیت کن،
# وگرنه هنگام برگشت از شاخهٔ orphan، git آن‌ها را حذف می‌کند!
git add -A
git commit -q -m "Sync: ${1:-before push}" || echo "(چیزی برای کامیت نبود)"

git checkout -q --orphan release-tmp
git add -A
git commit -q -m "Update: ${1:-sync admin panel code}"
git push --force "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}" release-tmp:main
git checkout -q main
git branch -D release-tmp
echo "✅ پوش شد: https://github.com/${REPO%.git}"

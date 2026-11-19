#!/usr/bin/env bash
# راه‌اندازی سرور پنل — هر وقت پنل باز نشد، این را اجرا کن:
#   bash scripts/start.sh
cd "$(dirname "$0")/.."

if curl -s -o /dev/null --max-time 3 http://localhost:3000/; then
  echo "✅ سرور همین حالا روشن است: http://localhost:3000"
  exit 0
fi

echo "▶ در حال روشن کردن سرور..."
nohup ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1 &
sleep 6
for i in $(seq 1 20); do
  if curl -s -o /dev/null --max-time 3 http://localhost:3000/; then
    echo "✅ سرور روشن شد: http://localhost:3000"
    exit 0
  fi
  sleep 3
done
echo "❌ سرور بالا نیامد — آخر لاگ: "
tail -15 dev.log
exit 1

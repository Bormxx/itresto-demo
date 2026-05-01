#!/bin/bash

# Проверяем наличие cwebp
if ! command -v cwebp &> /dev/null; then
    echo "Ошибка: cwebp не установлен"
    echo "Установите: sudo apt install webp"
    exit 1
fi

# Создаем папку для результатов
mkdir -p webp_converted

# Конвертируем все jpg файлы
for file in *.jpeg; do
    if [ -f "$file" ]; then
        output="webp_converted/${file%.jpeg}.webp"
        echo "Конвертируем: $file -> $output"
        cwebp -q 100 -resize 0 250 "$file" -o "$output"
    fi
done

for file in *.jpg; do
    if [ -f "$file" ]; then
        output="webp_converted/${file%.jpg}.webp"
        echo "Конвертируем: $file -> $output"
        cwebp -q 100 -resize 0 250 "$file" -o "$output"
    fi
done

echo "Конвертация завершена!"

# check_models.py
import requests
import os
import ssl

# 1. SSL Хак для Mac (чтобы запрос точно прошел)
os.environ['CURL_CA_BUNDLE'] = ''
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# 2. Твой ключ
API_KEY = "AIzaSyCKlUJxdGJo3n9SSUypDEUalrakCupSks8"

print("🔍 Спрашиваем у Google, какие модели доступны для этого ключа...")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

try:
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        print("\n✅ СПИСОК ДОСТУПНЫХ МОДЕЛЕЙ:")
        found_any = False
        for model in data.get('models', []):
            # Нас интересуют только модели, которые умеют генерировать контент
            if "generateContent" in model['supportedGenerationMethods']:
                print(f"   👉 {model['name']}")
                found_any = True
        
        if not found_any:
            print("⚠️ Список пуст! Ключ рабочий, но ни одной модели не подключено.")
    else:
        print(f"❌ Ошибка запроса: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"❌ Ошибка соединения: {e}")
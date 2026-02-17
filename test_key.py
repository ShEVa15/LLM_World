import httpx
import os

# Твой НОВЫЙ ключ из лога
API_KEY = "AIzaSyCKlUJxdGJo3n9SSUypDEUalrakCupSks8"

def check_key():
    print(f"🔍 Проверяем ключ: {API_KEY[:10]}...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
    
    try:
        # verify=False — это наш "таран" для SSL
        with httpx.Client(verify=False, timeout=10.0) as client:
            response = client.get(url)
            
            if response.status_code == 200:
                print("\n✅ УРА! Ключ работает. Доступные модели:")
                data = response.json()
                # Выведем только названия, чтобы не засорять экран
                for model in data.get('models', []):
                    if 'generateContent' in model['supportedGenerationMethods']:
                        print(f"  👉 {model['name']}")
            else:
                print(f"\n❌ Ошибка ключа: {response.status_code}")
                print(response.text)

    except Exception as e:
        print(f"\n❌ Ошибка сети (даже с httpx): {e}")

if __name__ == "__main__":
    check_key()
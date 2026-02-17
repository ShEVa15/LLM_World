import requests

API_URL = "http://127.0.0.1:8000"

# Агенты с НАВЫКАМИ
agents = [
    {
        "name": "Олег", 
        "role": "Backend Senior", 
        "skills": "python, sql, api, docker", 
        "current_mood_score": 0.6
    },
    {
        "name": "Аня", 
        "role": "UI/UX Designer", 
        "skills": "figma, design, css, colors", 
        "current_mood_score": 0.9
    },
    {
        "name": "Дима", 
        "role": "DevOps", 
        "skills": "linux, bash, ci/cd, server", 
        "current_mood_score": 0.5
    }
]

print("🌱 Заселяем мир умными агентами...")
for a in agents:
    try:
        r = requests.post(f"{API_URL}/agents/", json=a)
        if r.status_code == 200:
            print(f"✅ Агент {a['name']} создан (Skills: {a['skills']})")
        else:
            print(f"❌ Ошибка с {a['name']}: {r.text}")
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")

# Стартовые задачи (чтобы проверить навыки)
tasks = [
    {"title": "Написать API на Python", "description": "Для Олега", "complexity": 5, "assignee_id": 1}, # Олегу понравится
    {"title": "Нарисовать макет в Figma", "description": "Для Ани", "complexity": 5, "assignee_id": 2}, # Ане понравится
    {"title": "Настроить Linux сервер", "description": "Для Олега (не его профиль)", "complexity": 8, "assignee_id": 1} # Олег расстроится
]

print("\n📋 Раздаем тестовые задачи...")
for t in tasks:
    requests.post(f"{API_URL}/tasks/", json=t)

print("\n🚀 Готово!")
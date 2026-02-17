import streamlit as st
import requests
import pandas as pd
import time
import plotly.express as px

# --- КОНФИГУРАЦИЯ ---
API_URL = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="AI Lab Simulator 2026",
    page_icon="🧬",
    layout="wide"
)

st.markdown("""
    <style>
    .stProgress > div > div > div > div { background-color: #4CAF50; }
    div[data-testid="stMetricValue"] { font-size: 20px; }
    </style>
""", unsafe_allow_html=True)

def get_agents():
    try:
        response = requests.get(f"{API_URL}/agents/", timeout=1)
        if response.status_code == 200: return response.json()
    except: return None

def get_chats():
    try:
        response = requests.get(f"{API_URL}/chats/", timeout=1)
        if response.status_code == 200: return response.json()
    except: return []

def create_task(title, complexity, agent_id):
    payload = {
        "title": title, "description": "UI", "complexity": complexity,
        "estimated_hours": complexity * 2, "assignee_id": agent_id, "status": "todo"
    }
    try:
        requests.post(f"{API_URL}/tasks/", json=payload)
        return True
    except: return False

def set_speed(speed):
    try: requests.post(f"{API_URL}/simulation/speed/{speed}")
    except: pass

# --- UI ---
with st.sidebar:
    st.header("🎛 Панель Управления")
    speed = st.slider("⏩ Скорость", 0.1, 5.0, 1.0, 0.1)
    if st.button("Применить скорость"): set_speed(speed)
    st.divider()
    
    st.subheader("📝 Новая задача")
    agents_list = get_agents()
    if agents_list:
        agent_map = {f"{a['name']} ({a['role']})": a['id'] for a in agents_list}
        target_name = st.selectbox("Кому?", list(agent_map.keys()))
        task_title = st.text_input("Задача", "Пофиксить баги в Python")
        complexity = st.slider("Сложность", 1, 10, 5)
        if st.button("Назначить"):
            create_task(task_title, complexity, agent_map[target_name])
            st.toast("Отправлено!")

st.title("🧬 AI Laboratory Simulation")
placeholder = st.empty()

while True:
    agents_data = get_agents()
    chats_data = get_chats()
    
    with placeholder.container():
        if not agents_data:
            st.error("Нет связи с сервером")
        else:
            col_map, col_stats = st.columns([2, 1])
            # --- 1. КАРТА ОФИСА (Исправленная) ---
            with col_map:
                df = pd.DataFrame(agents_data)
                
                # Принудительно делаем координаты числами (на всякий случай)
                df['coord_x'] = pd.to_numeric(df['coord_x'])
                df['coord_y'] = pd.to_numeric(df['coord_y'])
                
                fig = px.scatter(
                    df, 
                    x="coord_x", y="coord_y",
                    color="current_mood_score",
                    # Яркая шкала, чтобы было видно на темном фоне
                    color_continuous_scale=["#FF4B4B", "#FFD700", "#00FF00"], 
                    range_color=[0, 1],
                    text="name",
                    title="📍 Карта Офиса (Real-time)",
                    # Включаем темный шаблон Plotly
                    template="plotly_dark" 
                )
                
                # Делаем точки большими и жирными
                fig.update_traces(
                    marker=dict(size=25, line=dict(width=2, color='white')), 
                    textposition='top center',
                    textfont=dict(size=14, color='white')
                )
                
                # Рисуем "стены" офиса (рамку)
                fig.update_layout(
                    xaxis=dict(range=[0, 100], showgrid=True, gridcolor='#333', zeroline=False, showticklabels=False),
                    yaxis=dict(range=[0, 100], showgrid=True, gridcolor='#333', zeroline=False, showticklabels=False),
                    height=500,
                    margin=dict(l=10, r=10, t=40, b=10),
                    # Прозрачный фон графика, чтобы сливался с приложением
                    paper_bgcolor='rgba(0,0,0,0)',
                    plot_bgcolor='rgba(0,0,0,0)',
                    # Рамка вокруг графика
                    shapes=[
                        dict(type="rect", x0=0, y0=0, x1=100, y1=100, line=dict(color="white", width=2))
                    ]
                )
                
                st.plotly_chart(fig, use_container_width=True, key=f"map_{time.time()}")

            with col_stats:
                st.subheader("📊 Команда")
                for agent in agents_data:
                    mood = agent['current_mood_score']
                    face = "🤬" if mood < 0.3 else "😐" if mood < 0.7 else "😎"
                    with st.expander(f"{face} {agent['name']} ({agent['role']})", expanded=True):
                        st.write(f"**Навыки:** `{agent.get('skills', 'Нет')}`")
                        st.progress(mood, text=f"Mood: {int(mood*100)}%")
                        st.caption(f"Статус: {agent['status']}")

            st.divider()
            st.subheader("💬 Живой Чат")
            if chats_data:
                for chat in chats_data:
                    with st.chat_message("assistant", avatar="🤖"):
                        st.markdown(f"**{' & '.join(chat['agents'])}**")
                        st.write(chat['text'])
    
    time.sleep(2)
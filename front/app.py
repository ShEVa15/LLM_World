import streamlit as st
import requests

BACKEND_URL = "http://localhost:8000"

st.set_page_config(layout="wide")
st.title("🧬 КИБЕР РЫВОК — симулятор агентов")

if st.button("⏩ Сделать шаг"):
    requests.post(f"{BACKEND_URL}/step")

state = requests.get(f"{BACKEND_URL}/state").json()

col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("Управление")
    st.write(f"Время: {state['time']}")
    speed = st.slider("Скорость (сек)", 0.5, 5.0, 1.0)

with col2:
    st.subheader("📋 Лента событий")
    for e in state['events']:
        st.text(e)

st.subheader("👥 Агенты")
cols = st.columns(len(state['agents']))
for col, agent in zip(cols, state['agents']):
    with col:
        if agent['mood'] > 0.6:
            mood_color = "green"
            mood_text = "😊"
        elif agent['mood'] > 0.3:
            mood_color = "orange"
            mood_text = "😐"
        else:
            mood_color = "red"
            mood_text = "😞"
        st.markdown(
            f"<div style='background-color: {mood_color}; padding:10px; border-radius:5px; color:white;'>"
            f"<b>{agent['name']}</b> {mood_text}<br>"
            f"<small>{agent['personality'][:30]}...</small>"
            f"</div>",
            unsafe_allow_html=True
        )
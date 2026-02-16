from yandex_gpt import YandexGPTConfigManagerForAPIKey
from yandex_gpt import YandexGPT

# Initialize the configuration manager with model type, catalog ID, and API key
config_manager = YandexGPTConfigManagerForAPIKey(
    model_type="yandexgpt",
    catalog_id="your_catalog_id",
    api_key="your_api_key"
)


# Initialize YandexGPT with a configuration manager
yandex_gpt = YandexGPT(config_manager=config_manager)

# Synchronous completion example
completion = yandex_gpt.get_sync_completion(messages=[{'role': 'user', 'text': 'Hello!'}])

print(completion)




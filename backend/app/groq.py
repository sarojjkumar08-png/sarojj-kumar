import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()


async def groq_chat(prompt: str, json_mode: bool = False) -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    model = os.getenv(
        "GROQ_MODEL",
        "llama-3.3-70b-versatile"
    ).strip()

    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY missing. Add it to backend/.env"
        )

    if not model:
        raise RuntimeError("GROQ_MODEL is empty.")

    url = "https://api.groq.com/openai/v1/chat/completions"

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3
    }

    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
        except httpx.TimeoutException:
            raise RuntimeError("Groq API request timed out.")
        except httpx.RequestError as exc:
            raise RuntimeError(
                f"Could not connect to Groq API: {exc}"
            )

    if response.status_code >= 400:
        try:
            error_data = response.json()
            message = error_data.get("error", {}).get(
                "message", response.text
            )
        except ValueError:
            message = response.text

        raise RuntimeError(
            f"Groq API HTTP {response.status_code}: {message}"
        )

    data = response.json()
    choices = data.get("choices", [])

    if not choices:
        raise RuntimeError("Groq returned no response choices.")

    result = choices[0].get("message", {}).get("content", "")

    if not result:
        raise RuntimeError("Groq returned an empty response.")

    if json_mode:
        try:
            json.loads(result)
        except json.JSONDecodeError:
            raise RuntimeError(
                "Groq returned invalid JSON. Please retry."
            )

    return result
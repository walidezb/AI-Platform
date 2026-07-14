import tiktoken
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class TokenCounter:
    def __init__(self, model: str = "gpt-4o"):
        try:
            self.encoder = tiktoken.encoding_for_model(model)
        except Exception:
            self.encoder = tiktoken.get_encoding("cl100k_base")

    def count(self, text: str) -> int:
        try:
            return len(self.encoder.encode(text))
        except Exception:
            # Fallback: rough estimate
            return len(text) // 4

    def count_messages(self, messages: List[Dict]) -> int:
        total = 0
        for msg in messages:
            total += self.count(msg.get("content", ""))
            total += 4  # overhead per message
        total += 2   # reply primer
        return total

# GPT-4o pricing (per 1M tokens as of 2024)
GPT4O_INPUT_COST_PER_TOKEN  = 5.00 / 1_000_000   # $5.00 per 1M input
GPT4O_OUTPUT_COST_PER_TOKEN = 15.00 / 1_000_000  # $15.00 per 1M output

def calculate_cost(input_tokens: int, output_tokens: int) -> float:
    return (
        input_tokens * GPT4O_INPUT_COST_PER_TOKEN +
        output_tokens * GPT4O_OUTPUT_COST_PER_TOKEN
    )

token_counter = TokenCounter()

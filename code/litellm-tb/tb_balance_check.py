"""
Token Bridge 余额检查回调 — LiteLLM async_moderation_hook

在请求发送到模型前调用，检查 customer_id 对应账本余额。
余额 ≤ 0 时抛出 402 HTTPException；Go API 不可用时 fail-open（放行）。
"""

import os
from typing import Any, Optional

import httpx
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# 环境变量（与 T1 Go API 端点共享配置口径）
# ---------------------------------------------------------------------------
TBV2_INTERNAL_API_URL: str = os.getenv("TBV2_INTERNAL_API_URL", "http://localhost:8080")
TBV2_INTERNAL_API_TOKEN: str = os.getenv("TBV2_INTERNAL_API_TOKEN", "")


# ---------------------------------------------------------------------------
# async_moderation_hook
# ---------------------------------------------------------------------------
async def async_moderation_hook(
    user_api_key_dict: dict[str, Any],
    *args: Any,
    **kwargs: Any,
) -> Optional[dict[str, Any]]:
    """
    LiteLLM pre-call moderation hook。

    从 user_api_key_dict.metadata.customer_id 提取客户 ID，
    调用 Go 内部 API `GET /v1/internal/balance/{customer_id}` 检查余额。

    返回:
        - None 或原 dict → 放行（balance > 0 或 API 不可用）
        - raise HTTPException(402) → 拒绝（balance ≤ 0）
    """
    customer_id: Optional[str] = user_api_key_dict.get("metadata", {}).get("customer_id")
    if not customer_id:
        # 无 customer_id → fail-open，依赖第二道防线
        return None

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"{TBV2_INTERNAL_API_URL}/v1/internal/balance/{customer_id}",
                headers={
                    "Authorization": f"Bearer {TBV2_INTERNAL_API_TOKEN}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            balance = data.get("balance", 0)
            if balance <= 0:
                raise HTTPException(
                    status_code=402,
                    detail={"error": "balance_insufficient", "balance": balance},
                )
    except HTTPException:
        # 余额不足，重新抛出
        raise
    except Exception:
        # 网络异常 / Go API 不可用 → fail-open
        pass

    return None

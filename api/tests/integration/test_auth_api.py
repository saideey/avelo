import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_send_otp(client: AsyncClient):
    response = await client.post("/api/v1/auth/send-otp", json={"phone": "+998901234567"})
    assert response.status_code == 200
    data = response.json()
    assert data["message"]


@pytest.mark.asyncio
async def test_verify_otp(client: AsyncClient):
    # First send OTP
    await client.post("/api/v1/auth/send-otp", json={"phone": "+998901234567"})

    # Verify with test code 1234
    response = await client.post("/api/v1/auth/verify-otp", json={
        "phone": "+998901234567",
        "code": "1234"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_verify_otp_wrong_code(client: AsyncClient):
    await client.post("/api/v1/auth/send-otp", json={"phone": "+998901234567"})

    response = await client.post("/api/v1/auth/verify-otp", json={
        "phone": "+998901234567",
        "code": "9999"
    })
    assert response.status_code in [400, 401]


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 422 or response.status_code == 401


@pytest.mark.asyncio
async def test_full_auth_flow(client: AsyncClient):
    # Send OTP
    await client.post("/api/v1/auth/send-otp", json={"phone": "+998909999999"})

    # Verify OTP
    response = await client.post("/api/v1/auth/verify-otp", json={
        "phone": "+998909999999",
        "code": "1234"
    })
    assert response.status_code == 200
    tokens = response.json()

    # Get profile
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert response.status_code == 200

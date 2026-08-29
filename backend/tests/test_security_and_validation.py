import io
import pytest
from app.core.config import settings

@pytest.fixture(autouse=True)
def mock_api_keys():
    settings.GNANI_API_KEY = "test_gnani_key"
    settings.GEMINI_API_KEY = "test_gemini_key"

# 1. Security Headers Test
def test_security_headers_present(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    headers = response.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "strict-transport-security" in headers
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "permissions-policy" in headers
    assert headers.get("x-xss-protection") == "1; mode=block"

# 2. CORS Test (Allowed vs Disallowed Origins & Methods)
def test_cors_allowed_origin(client):
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
    }
    response = client.options("/api/v1/notes/upload", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

def test_cors_disallowed_origin(client):
    headers = {
        "Origin": "https://malicious-site.com",
        "Access-Control-Request-Method": "POST",
    }
    response = client.options("/api/v1/notes/upload", headers=headers)
    # Disallowed origin does not get Access-Control-Allow-Origin header
    assert response.headers.get("access-control-allow-origin") is None

# 3. Request Size Limit Test (> 15MB)
def test_request_size_limit_exceeded(client):
    oversized_content = b"0" * (16 * 1024 * 1024) # 16MB
    files = {"file": ("big_recording.mp3", io.BytesIO(oversized_content), "audio/mpeg")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "File exceeds maximum allowed size of 15MB" in response.json()["detail"]

# 4. Input Validation Tests
def test_input_validation_empty_file(client):
    files = {"file": ("empty.mp3", io.BytesIO(b""), "audio/mpeg")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_input_validation_disallowed_extension(client):
    files = {"file": ("script.sh", io.BytesIO(b"echo 'hello'"), "text/x-shellscript")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_input_validation_invalid_audio_stream(client):
    files = {"file": ("corrupt.mp3", io.BytesIO(b"Not an audio stream"), "audio/mpeg")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "Invalid or corrupted audio file" in response.json()["detail"] or "Unable to decode" in response.json()["detail"]

# 5. Valid Request Test (End-to-End Workflow)
def test_valid_request_workflow(client, monkeypatch):
    # Mock audio validation to return a valid duration for fake audio
    from app.services import audio
    monkeypatch.setattr(audio, "get_audio_duration_and_validate", lambda path: 45.0)
    
    files = {"file": ("demo_note.mp3", io.BytesIO(b"ID3\x03\x00\x00\x00\x00\x00\x00MockMP3Data"), "audio/mpeg")}
    data = {"title": "Engineering Standup"}
    
    # 1. Create note
    res = client.post("/api/v1/notes/upload", files=files, data=data)
    assert res.status_code == 201
    created_note = res.json()
    assert created_note["title"] == "Engineering Standup"
    assert created_note["status"] == "UPLOADED"
    assert created_note["slug"] is not None
    note_id = created_note["id"]

    # 2. Retrieve note by ID
    get_res = client.get(f"/api/v1/notes/{note_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == note_id

    # 3. Retrieve note by Slug
    slug_res = client.get(f"/api/v1/notes/{created_note['slug']}")
    assert slug_res.status_code == 200
    assert slug_res.json()["id"] == note_id

    # 4. List all notes
    list_res = client.get("/api/v1/notes")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 5. Delete note
    del_res = client.delete(f"/api/v1/notes/{note_id}")
    assert del_res.status_code == 204

    # 6. Verify 404 after deletion
    not_found_res = client.get(f"/api/v1/notes/{note_id}")
    assert not_found_res.status_code == 404

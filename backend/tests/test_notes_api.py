import io
import pytest
from app.core.config import settings

@pytest.fixture(autouse=True)
def mock_api_keys():
    settings.GNANI_API_KEY = "test_gnani_key"
    settings.GEMINI_API_KEY = "test_gemini_key"

def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["version"] == "v1"

def test_upload_missing_api_keys(client):
    settings.GNANI_API_KEY = ""
    files = {"file": ("test.mp3", io.BytesIO(b"Fake audio content"), "audio/mpeg")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "Speech-to-text transcription service is currently unavailable" in response.json()["detail"]

def test_upload_invalid_file_extension(client):
    files = {"file": ("test.txt", io.BytesIO(b"Hello world"), "text/plain")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_upload_empty_file(client):
    files = {"file": ("empty.mp3", io.BytesIO(b""), "audio/mpeg")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

def test_upload_and_list_note(client):
    fake_audio_content = b"ID3\x03\x00\x00\x00\x00\x00\x00Fake MP3 header and audio content for testing."
    files = {"file": ("meeting_notes.mp3", io.BytesIO(fake_audio_content), "audio/mpeg")}
    data = {"title": "Q3 Planning Meeting"}
    
    upload_res = client.post("/api/v1/notes/upload", files=files, data=data)
    assert upload_res.status_code == 201
    note_data = upload_res.json()
    assert note_data["title"] == "Q3 Planning Meeting"
    assert note_data["status"] == "UPLOADED"
    note_id = note_data["id"]

    list_res = client.get("/api/v1/notes")
    assert list_res.status_code == 200
    notes_list = list_res.json()
    assert len(notes_list) == 1
    assert notes_list[0]["id"] == note_id

    detail_res = client.get(f"/api/v1/notes/{note_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == note_id

    status_res = client.get(f"/api/v1/notes/{note_id}/status")
    assert status_res.status_code == 200
    assert status_res.json()["id"] == note_id

    delete_res = client.delete(f"/api/v1/notes/{note_id}")
    assert delete_res.status_code == 204

    get_after_delete = client.get(f"/api/v1/notes/{note_id}")
    assert get_after_delete.status_code == 404

def test_upload_non_mp3_audio(client):
    fake_audio_content = b"Fake AAC/M4A audio content for testing."
    files = {"file": ("recording.m4a", io.BytesIO(fake_audio_content), "audio/x-m4a")}
    data = {"title": "M4A Voice Memo"}
    
    upload_res = client.post("/api/v1/notes/upload", files=files, data=data)
    assert upload_res.status_code == 201
    note_data = upload_res.json()
    assert note_data["title"] == "M4A Voice Memo"
    assert note_data["status"] == "UPLOADED"

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

import wave

def create_valid_wav_bytes(duration_secs: float = 1.0) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        num_frames = int(16000 * duration_secs)
        wav_file.writeframes(b"\x00\x00" * num_frames)
    return buf.getvalue()

def test_upload_empty_file(client):
    files = {"file": ("empty.mp3", io.BytesIO(b""), "audio/mpeg")}
    response = client.post("/api/v1/notes/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

def test_upload_and_list_note(client):
    valid_wav_content = create_valid_wav_bytes(2.0)
    files = {"file": ("meeting_notes.wav", io.BytesIO(valid_wav_content), "audio/wav")}
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

def test_upload_non_mp3_audio(client, monkeypatch):
    from app.services import audio
    monkeypatch.setattr(audio, "get_audio_duration_and_validate", lambda path: 15.0)
    
    valid_wav = create_valid_wav_bytes(1.0)
    files = {"file": ("recording.wav", io.BytesIO(valid_wav), "audio/wav")}
    data = {"title": "WAV Voice Memo"}
    
    upload_res = client.post("/api/v1/notes/upload", files=files, data=data)
    assert upload_res.status_code == 201
    note_data = upload_res.json()
    assert note_data["title"] == "WAV Voice Memo"
    assert note_data["status"] == "UPLOADED"

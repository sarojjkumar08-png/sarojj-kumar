import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app import store

client = TestClient(app)


def test_health_and_demo_seed():
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'ok'
    assert data['students'] == 10
    assert data['skills'] == 50
    assert response.headers['cache-control'].startswith('no-store')


def test_student_dashboard_contains_skills_and_readiness():
    response = client.get('/api/student/dashboard?student_id=student-001')
    assert response.status_code == 200
    data = response.json()
    assert len(data['skills']) == 5
    assert 0 <= data['readiness_score'] <= 100


def test_hod_heatmap_percentages_sum_to_about_100():
    response = client.get('/api/hod/dashboard')
    assert response.status_code == 200
    data = response.json()
    assert len(data['heatmap']) == 5
    for subject in data['heatmap']:
        total = subject['red_percent'] + subject['yellow_percent'] + subject['green_percent']
        assert 99.8 <= total <= 100.2
    assert len(data['top_dead_skills']) <= 10


def test_company_view_excludes_readiness_at_or_below_70():
    response = client.get('/api/company/students?min_readiness=70')
    assert response.status_code == 200
    data = response.json()
    assert all(student['readiness'] > 70 for student in data['students'])


def test_quiz_submission_updates_skill_and_readiness():
    skill = next(s for s in store.SKILLS if s['user_id'] == 'student-001')
    before = skill['freshness_score']
    quiz_id = 'test-quiz-for-submit'
    quiz = {
        'id': quiz_id, 'user_id': skill['user_id'], 'skill_id': skill['id'],
        'subject_name': skill['subject_name'],
        'questions': [{'question': f'Q{i}', 'options':['A','B','C','D'], 'answer':0, 'explanation':'test'} for i in range(10)],
        'score': None, 'generated_by_agent':'test', 'created_at':'2026-01-01T00:00:00+00:00'
    }
    store.QUIZZES.append(quiz)
    try:
        response = client.post('/api/quizzes/submit', json={'quiz_id':quiz_id,'answers':[0]*10})
        assert response.status_code == 200
        result = response.json()
        assert result['score'] == 100
        assert result['freshness_after'] >= min(100, max(before + 20, 90))
        assert result['readiness_score'] == store.readiness(skill['user_id'])
        assert skill['last_quiz_score'] == 100
    finally:
        store.QUIZZES[:] = [q for q in store.QUIZZES if q['id'] != quiz_id]

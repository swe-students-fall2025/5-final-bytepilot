# tests/test_app.py
import json
import pytest
import importlib
from bson import ObjectId
from datetime import datetime

# Import the Flask factory and module namespace so we can monkeypatch render_template
from app import create_app
import app as app_module
#
# Minimal in-memory fake MongoDB implementation used for testing
#
class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class UpdateOneResult:
    def __init__(self, matched_count=0, modified_count=0):
        self.matched_count = matched_count
        self.modified_count = modified_count

class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *args, **kwargs):
        # For tests we won't rely on actual sort behaviour; keep order as inserted
        return self

    def __iter__(self):
        return iter(self._docs)

class FakeCollection:
    def __init__(self):
        self._docs = {}

    def _convert_for_return(self, doc):
        """
        Convert ObjectId values in places where Flask will JSONify them:
        - top-level _id -> keep as ObjectId for internal tests, but when returning
          to app routes we sometimes need string values for nested character _id.
        We will return a shallow copy and convert characters[*]['_id'] to str.
        """
        if doc is None:
            return None
        d = dict(doc)  # shallow copy
        # convert nested characters' _id if present (list of dicts)
        chars = d.get("characters")
        if isinstance(chars, list):
            new_chars = []
            for c in chars:
                if isinstance(c, dict):
                    ccopy = dict(c)
                    if "_id" in ccopy and isinstance(ccopy["_id"], ObjectId):
                        ccopy["_id"] = str(ccopy["_id"])
                    new_chars.append(ccopy)
                else:
                    new_chars.append(c)
            d["characters"] = new_chars
        # convert top-level _id in characters list in user['characters'] (already above)
        # convert threads list entries if they are ObjectId -> keep as ObjectId (app uses them internally)
        return d

    def find_one(self, query):
        if not query:
            return None
        # _id support
        if "_id" in query:
            v = query["_id"]
            doc = self._docs.get(str(v))
            return self._convert_for_return(doc)
        # email lookup
        if "email" in query:
            for d in self._docs.values():
                if d.get("email") == query["email"]:
                    return self._convert_for_return(d)
        # combined lookup like {"_id": tid, "user_id": ObjectId(...)}
        if "_id" in query and "user_id" in query:
            doc = self._docs.get(str(query["_id"]))
            if doc and doc.get("user_id") == query["user_id"]:
                return self._convert_for_return(doc)
            return None
        # naive equality matching
        for d in self._docs.values():
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return self._convert_for_return(d)
        return None

    def insert_one(self, doc):
        oid = ObjectId()
        d = dict(doc)
        d["_id"] = oid
        self._docs[str(oid)] = d
        return InsertOneResult(inserted_id=oid)

    def update_one(self, query, update):
        doc = None
        if "_id" in query:
            doc = self._docs.get(str(query["_id"]))
        elif "email" in query:
            doc = self.find_one({"email": query["email"]})
            # find_one returns converted doc; need original in storage
            if doc:
                doc = self._docs.get(str(doc["_id"]))
        else:
            # generic matching
            for d in self._docs.values():
                match = True
                for k, v in query.items():
                    if d.get(k) != v:
                        match = False
                        break
                if match:
                    doc = d
                    break
        if not doc:
            return UpdateOneResult(0, 0)
        if "$push" in update:
            for field, val in update["$push"].items():
                lst = doc.get(field, [])
                lst.append(val)
                doc[field] = lst
            return UpdateOneResult(1, 1)
        if "$pull" in update:
            for field, val in update["$pull"].items():
                orig = doc.get(field, [])
                new = []
                removed = 0
                for item in orig:
                    if isinstance(val, dict):
                        match = True
                        for k2, v2 in val.items():
                            if item.get(k2) != v2:
                                match = False
                                break
                        if not match:
                            new.append(item)
                        else:
                            removed += 1
                    else:
                        if item != val:
                            new.append(item)
                        else:
                            removed += 1
                doc[field] = new
            return UpdateOneResult(1, 1 if removed else 0)
        if "$set" in update:
            for field, val in update["$set"].items():
                doc[field] = val
            return UpdateOneResult(1, 1)
        return UpdateOneResult(1, 0)

    def find(self, query=None):
        query = query or {}
        docs = []
        for d in self._docs.values():
            match = True
            for k, v in query.items():
                # support matching ObjectId for user_id
                if isinstance(v, ObjectId):
                    if d.get(k) != v:
                        match = False
                        break
                else:
                    if d.get(k) != v:
                        match = False
                        break
            if match:
                # for find results (forums list), convert nested char _id to string as well
                # clone doc and convert characters[*]['_id'] to str
                clone = dict(d)
                chars = clone.get("characters")
                if isinstance(chars, list):
                    new_chars = []
                    for c in chars:
                        if isinstance(c, dict):
                            ccopy = dict(c)
                            if "_id" in ccopy and isinstance(ccopy["_id"], ObjectId):
                                ccopy["_id"] = str(ccopy["_id"])
                            new_chars.append(ccopy)
                        else:
                            new_chars.append(c)
                    clone["characters"] = new_chars
                docs.append(clone)
        return FakeCursor(docs)

class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.forums = FakeCollection()

    def __getitem__(self, name):
        # mimic client[db_name] returning database-like object
        return self

#
# Pytest fixtures
#
@pytest.fixture
def app_and_client(monkeypatch):
    # patch the render_template in the app module to avoid TemplateNotFound
    def fake_render_template(template_name, **kwargs):
        # return a reproducible string including template name and keys for assertions
        # convert non-serializable objects to strings
        def safe(o):
            try:
                return json.loads(json.dumps(o, default=str))
            except Exception:
                return str(o)
        keys = {k: safe(v) for k, v in kwargs.items()}
        return f"TEMPLATE:{template_name}:{json.dumps(keys, default=str)}"

    monkeypatch.setattr(app_module, "render_template", fake_render_template)
    
    # Set SECRET_KEY for testing if not already set
    import os
    if not os.getenv("SECRET_KEY"):
        os.environ["SECRET_KEY"] = "test-secret-key-for-ci"

    app = create_app(testing=True)
    fake_db = FakeDB()
    app.db = fake_db

    # Create a DummyUser class to be returned by the user loader
    class DummyUser:
        def __init__(self, doc):
            self._doc = doc or {}
            self.id = str(self._doc.get("_id")) if self._doc.get("_id") else None
            self.is_authenticated = True if self._doc else False

        def get_id(self):
            return self.id

    # register a user loader that returns DummyUser
    def fake_load_user(user_id):
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = app.db.users.find_one({"_id": oid})
        return DummyUser(doc) if doc else None

    app.login_manager.user_loader(fake_load_user)

    client = app.test_client()
    yield app, client, fake_db

#
# Tests
#
def test_register_creates_user(app_and_client):
    app, client, fake_db = app_and_client

    resp = client.post("/register", data={
        "username": "tester",
        "email": "tester@example.com",
        "password": "pass",
        "confirm-password": "pass"
    }, follow_redirects=False)

    # expecting redirect to profile (302)
    assert resp.status_code in (302, 303)

    user = fake_db.users.find_one({"email": "tester@example.com"})
    assert user is not None
    assert user["username"] == "tester"
    assert user["password"] == "pass"
    assert isinstance(user["_id"], ObjectId)

def test_login_flow_success_and_failure(app_and_client):
    app, client, fake_db = app_and_client

    # insert user
    user_doc = {
        "username": "loginuser",
        "email": "login@example.com",
        "password": "secret",
        "characters": [],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    uid = res.inserted_id

    # GET login page should return our fake template string
    get_resp = client.get("/login")
    assert get_resp.status_code == 200
    assert "TEMPLATE:login.html" in get_resp.get_data(as_text=True)

    # Wrong password -> redirect back to login
    resp_bad = client.post("/login", data={"email": "login@example.com", "password": "nope"}, follow_redirects=False)
    assert resp_bad.status_code in (302, 303)

    # Correct password -> redirect to profile
    resp_ok = client.post("/login", data={"email": "login@example.com", "password": "secret"}, follow_redirects=False)
    assert resp_ok.status_code in (302, 303)

def test_get_thread_published_and_draft_access_control(app_and_client):
    app, client, fake_db = app_and_client

    # published thread (public)
    pub = fake_db.forums.insert_one({
        "user_id": ObjectId(),
        "title": "Public Thread",
        "status": "published",
        "posts": [{"content": "hello"}],
        "characters": [],
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "published_at": datetime.utcnow()
    })
    pub_id = str(pub.inserted_id)

    r = client.get(f"/api/thread/{pub_id}")
    assert r.status_code == 200
    data = r.get_json()
    assert data["ok"] is True
    assert data["thread"]["title"] == "Public Thread"

    # draft thread owned by user - not visible to anonymous
    owner_doc = {
        "username": "owner",
        "email": "owner@example.com",
        "password": "pw",
        "characters": [],
        "threads": []
    }
    owner_res = fake_db.users.insert_one(owner_doc)
    owner_oid = owner_res.inserted_id

    draft = fake_db.forums.insert_one({
        "user_id": owner_oid,
        "title": "Secret Draft",
        "status": "draft",
        "posts": [],
        "characters": [],
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    })
    draft_id = str(draft.inserted_id)

    # anonymous should get 403
    r2 = client.get(f"/api/thread/{draft_id}")
    assert r2.status_code == 403
    assert r2.get_json()["ok"] is False

    # now log in as owner and request should succeed
    with client.session_transaction() as sess:
        sess["_user_id"] = str(owner_oid)
    r3 = client.get(f"/api/thread/{draft_id}")
    assert r3.status_code == 200
    assert r3.get_json()["ok"] is True

def test_createforum_requires_login_and_inserts_thread(app_and_client):
    app, client, fake_db = app_and_client

    # create user with one character
    user_doc = {
        "username": "forumuser",
        "email": "u@example.com",
        "password": "pw",
        "characters": [{
            "_id": ObjectId(),
            "name": "Char A",
            "nickname": "CA",
            "fandom": "Original",
            "pic": "/static/images/default.png"
        }],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id

    # set session to simulate login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)

    payload = {
        "title": "My thread",
        "status": "published",
        "posts": [
            {
                "characterIndex": 0,
                "nickname": "CA",
                "avatar": "/static/images/default.png",
                "content": "Hello world",
                "floor": 1
            }
        ]
    }

    resp = client.post("/createforum", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    created_id = data["id"]
    assert fake_db.forums.find_one({"_id": ObjectId(created_id)}) is not None

    # user's threads got updated
    user_after = fake_db.users.find_one({"_id": user_oid})
    assert "threads" in user_after and len(user_after["threads"]) >= 1

def test_characters_add_and_delete_and_api(app_and_client):
    app, client, fake_db = app_and_client

    # create user
    udoc = {
        "username": "cuser",
        "email": "cuser@example.com",
        "password": "pw",
        "characters": [],
        "threads": []
    }
    res = fake_db.users.insert_one(udoc)
    uid = res.inserted_id

    # login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(uid)

    # GET /addcharacter
    r = client.get("/addcharacter")
    assert r.status_code == 200
    assert "TEMPLATE:addcharacter.html" in r.get_data(as_text=True)

    # POST addcharacter
    r2 = client.post("/addcharacter", data={
        "name": "NewChar",
        "nickname": "NC",
        "fandom": "Fan",
        "pic": "/static/images/default.png"
    }, follow_redirects=False)
    assert r2.status_code in (302, 303)
    user_after = fake_db.users.find_one({"_id": uid})
    assert len(user_after.get("characters", [])) == 1
    # char_id is stored as ObjectId in DB; our fake convert-for-return converts nested char _id to str
    char_id = user_after["characters"][0]["_id"]

    # API my_characters
    r3 = client.get("/api/my_characters")
    assert r3.status_code == 200
    j = r3.get_json()
    assert j["ok"] is True
    assert len(j["characters"]) == 1

    # deletecharacter (post)
    # Pass the char_id (string form returned by find_one), but delete route expects ObjectId-like string - our FakeCollection $pull matches by _id equality
    r4 = client.post(f"/deletecharacter/{char_id}")
    assert r4.status_code in (302, 303)
    user_after2 = fake_db.users.find_one({"_id": uid})
    assert len(user_after2.get("characters", [])) == 0

def test_api_published_forums_and_community_and_my_forums(app_and_client):
    app, client, fake_db = app_and_client

    # prepare published forums
    t1 = fake_db.forums.insert_one({
        "user_id": ObjectId(),
        "title": "P1",
        "status": "published",
        "posts": [],
        "characters": [],
        "created_at": datetime.utcnow(),
        "published_at": datetime.utcnow()
    })
    t2 = fake_db.forums.insert_one({
        "user_id": ObjectId(),
        "title": "P2",
        "status": "published",
        "posts": [],
        "characters": [],
        "created_at": datetime.utcnow(),
        "published_at": datetime.utcnow()
    })

    r = client.get("/api/published_forums")
    assert r.status_code == 200
    j = r.get_json()
    assert j["ok"] is True
    titles = {f["title"] for f in j["forums"]}
    assert "P1" in titles and "P2" in titles

    # community endpoint should mirror published forums
    r2 = client.get("/api/community")
    assert r2.status_code == 200
    j2 = r2.get_json()
    assert j2["ok"] is True
    assert len(j2["forums"]) >= 2

    # my_forums - create a user and assign two threads
    user_doc = {
        "username": "listuser",
        "email": "list@example.com",
        "password": "pw",
        "characters": [],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id

    t3 = fake_db.forums.insert_one({
        "user_id": user_oid,
        "title": "Mine1",
        "status": "draft",
        "posts": [],
        "characters": [],
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    })
    t4 = fake_db.forums.insert_one({
        "user_id": user_oid,
        "title": "Mine2",
        "status": "published",
        "posts": [],
        "characters": [],
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    })

    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)

    r3 = client.get("/api/my_forums")
    assert r3.status_code == 200
    j3 = r3.get_json()
    assert j3["ok"] is True
    got_titles = {f["title"] for f in j3["forums"]}
    assert "Mine1" in got_titles and "Mine2" in got_titles


# Other tests

def test_register_with_existing_email(app_and_client):
    """Test registration fails when email already exists."""
    app, client, fake_db = app_and_client
    
    # First create a user
    fake_db.users.insert_one({
        "username": "existing",
        "email": "existing@example.com",
        "password": "pass",
        "characters": [],
        "threads": []
    })
    
    # Try to register with same email
    resp = client.post("/register", data={
        "username": "newuser",
        "email": "existing@example.com",  # Already exists
        "password": "newpass",
        "confirm-password": "newpass"
    }, follow_redirects=False)
    
    # Should redirect back to register
    assert resp.status_code in (302, 303)

def test_register_password_mismatch(app_and_client):
    """Test registration fails when passwords don't match."""
    app, client, fake_db = app_and_client
    
    resp = client.post("/register", data={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password1",
        "confirm-password": "password2"  # Different
    }, follow_redirects=False)
    
    # Should redirect back to register
    assert resp.status_code in (302, 303)

def test_register_missing_fields(app_and_client):
    """Test registration fails when fields are missing."""
    app, client, fake_db = app_and_client
    
    # Missing username
    resp = client.post("/register", data={
        "username": "",
        "email": "test@example.com",
        "password": "pass",
        "confirm-password": "pass"
    }, follow_redirects=False)
    
    # Should redirect back to register
    assert resp.status_code in (302, 303)

def test_login_missing_fields(app_and_client):
    """Test login fails when fields are missing."""
    app, client, fake_db = app_and_client
    
    # Missing email
    resp = client.post("/login", data={
        "email": "",
        "password": "password"
    }, follow_redirects=False)
    
    # Should redirect back to login
    assert resp.status_code in (302, 303)

def test_login_wrong_password(app_and_client):
    """Test login fails with wrong password."""
    app, client, fake_db = app_and_client
    
    # Create user
    fake_db.users.insert_one({
        "username": "testuser",
        "email": "test@example.com",
        "password": "correctpassword",
        "characters": [],
        "threads": []
    })
    
    # Try with wrong password
    resp = client.post("/login", data={
        "email": "test@example.com",
        "password": "wrongpassword"
    }, follow_redirects=False)
    
    # Should redirect back to login
    assert resp.status_code in (302, 303)

def test_login_nonexistent_user(app_and_client):
    """Test login fails with non-existent user."""
    app, client, fake_db = app_and_client
    
    resp = client.post("/login", data={
        "email": "nonexistent@example.com",
        "password": "password"
    }, follow_redirects=False)
    
    # Should redirect back to login
    assert resp.status_code in (302, 303)

def test_createforum_validation_errors(app_and_client):
    """Test createforum validation errors."""
    app, client, fake_db = app_and_client
    
    # Create user with character
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [{
            "_id": ObjectId(),
            "name": "Test Char",
            "nickname": "TC",
            "fandom": "Test",
            "pic": "/static/images/default.png"
        }],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Test 1: Empty title
    payload1 = {
        "title": "",
        "posts": [{"characterIndex": 0, "content": "Hello"}]
    }
    resp1 = client.post("/createforum", data=json.dumps(payload1), content_type="application/json")
    assert resp1.status_code == 400
    data1 = resp1.get_json()
    assert data1["ok"] is False
    assert "Title is required" in data1["error"]
    
    # Test 2: No posts
    payload2 = {
        "title": "Test Title",
        "posts": []
    }
    resp2 = client.post("/createforum", data=json.dumps(payload2), content_type="application/json")
    assert resp2.status_code == 400
    data2 = resp2.get_json()
    assert data2["ok"] is False
    assert "At least one post is required" in data2["error"]
    
    # Test 3: Invalid character index
    payload3 = {
        "title": "Test Title",
        "posts": [{"characterIndex": 999, "content": "Hello"}]
    }
    resp3 = client.post("/createforum", data=json.dumps(payload3), content_type="application/json")
    assert resp3.status_code == 400
    data3 = resp3.get_json()
    assert data3["ok"] is False
    assert "Character index out of range" in data3["error"]
    
    # Test 4: Empty post content
    payload4 = {
        "title": "Test Title",
        "posts": [{"characterIndex": 0, "content": ""}]
    }
    resp4 = client.post("/createforum", data=json.dumps(payload4), content_type="application/json")
    assert resp4.status_code == 400
    data4 = resp4.get_json()
    assert data4["ok"] is False
    assert "Content required" in data4["error"]

def test_createforum_update_thread(app_and_client):
    """Test updating an existing forum thread."""
    app, client, fake_db = app_and_client
    
    # Create user with character
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [{
            "_id": ObjectId(),
            "name": "Test Char",
            "nickname": "TC",
            "fandom": "Test",
            "pic": "/static/images/default.png"
        }],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Create an existing thread
    thread_res = fake_db.forums.insert_one({
        "user_id": user_oid,
        "title": "Old Title",
        "status": "draft",
        "posts": [],
        "characters": [],
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    })
    thread_id = thread_res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Update the thread
    payload = {
        "id": str(thread_id),
        "title": "Updated Title",
        "status": "published",
        "posts": [{
            "characterIndex": 0,
            "nickname": "TC",
            "avatar": "/static/images/default.png",
            "content": "Updated content",
            "floor": 1
        }]
    }
    
    resp = client.post("/createforum", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["ok"] is True
    assert data["id"] == str(thread_id)
    
    # Verify thread was updated
    updated = fake_db.forums.find_one({"_id": thread_id})
    assert updated["title"] == "Updated Title"
    assert updated["status"] == "published"
    assert len(updated["posts"]) == 1

def test_createforum_update_not_found(app_and_client):
    """Test updating a thread that doesn't exist."""
    app, client, fake_db = app_and_client
    
    # Create user
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [{
            "_id": ObjectId(),
            "name": "Test Char",
            "nickname": "TC",
            "fandom": "Test",
            "pic": "/static/images/default.png"
        }],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Try to update non-existent thread
    payload = {
        "id": "507f1f77bcf86cd799439999",  # Non-existent ID
        "title": "Test Title",
        "posts": [{"characterIndex": 0, "content": "Hello"}]
    }
    
    resp = client.post("/createforum", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["ok"] is False
    assert "Thread not found" in data["error"]

def test_createforum_no_characters(app_and_client):
    """Test createforum fails when user has no characters."""
    app, client, fake_db = app_and_client
    
    # Create user WITHOUT characters
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [],  # Empty!
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    payload = {
        "title": "Test Title",
        "posts": [{"characterIndex": 0, "content": "Hello"}]
    }
    
    resp = client.post("/createforum", data=json.dumps(payload), content_type="application/json")
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["ok"] is False
    assert "You have no characters" in data["error"]

def test_get_thread_invalid_id(app_and_client):
    """Test get_thread with invalid thread ID."""
    app, client, fake_db = app_and_client
    
    resp = client.get("/api/thread/invalid-id")
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["ok"] is False
    assert "Invalid thread id" in data["error"]

def test_get_thread_not_found(app_and_client):
    """Test get_thread with non-existent thread ID."""
    app, client, fake_db = app_and_client
    
    non_existent_id = "507f1f77bcf86cd799439999"
    resp = client.get(f"/api/thread/{non_existent_id}")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["ok"] is False
    assert "Thread not found" in data["error"]

def test_my_forum_by_id_not_found(app_and_client):
    """Test getting user's forum by ID when not found."""
    app, client, fake_db = app_and_client
    
    # Create user
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Try to get non-existent forum
    non_existent_id = "507f1f77bcf86cd799439999"
    resp = client.get(f"/api/my_forums/{non_existent_id}")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["ok"] is False
    assert "Thread not found" in data["error"]

def test_my_forum_by_id_invalid_id(app_and_client):
    """Test getting user's forum by ID with invalid ID."""
    app, client, fake_db = app_and_client
    
    # Create user
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Invalid ID
    resp = client.get("/api/my_forums/invalid-id")
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["ok"] is False
    assert "Invalid thread id" in data["error"]

def test_logout_requires_login(app_and_client):
    """Test logout requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.get("/logout", follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_profile_requires_login(app_and_client):
    """Test profile page requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.get("/profile", follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_index_page(app_and_client):
    """Test index page loads."""
    app, client, fake_db = app_and_client
    
    resp = client.get("/")
    assert resp.status_code == 200
    assert "TEMPLATE:index.html" in resp.get_data(as_text=True)

def test_forum_page(app_and_client):
    """Test forum page loads."""
    app, client, fake_db = app_and_client
    
    resp = client.get("/forum")
    assert resp.status_code == 200
    assert "TEMPLATE:forum.html" in resp.get_data(as_text=True)

def test_community_page(app_and_client):
    """Test community page loads."""
    app, client, fake_db = app_and_client
    
    resp = client.get("/community")
    assert resp.status_code == 200
    assert "TEMPLATE:community.html" in resp.get_data(as_text=True)

def test_viewthread_page(app_and_client):
    """Test viewthread page loads with thread ID."""
    app, client, fake_db = app_and_client
    
    resp = client.get("/viewthread/507f1f77bcf86cd799439011")
    assert resp.status_code == 200
    assert "TEMPLATE:viewthread.html" in resp.get_data(as_text=True)

def test_characters_page_requires_login(app_and_client):
    """Test characters page requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.get("/characters", follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_addcharacter_page_requires_login(app_and_client):
    """Test addcharacter page requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.get("/addcharacter", follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_createforum_get_requires_login(app_and_client):
    """Test createforum GET requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.get("/createforum", follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_addcharacter_post_requires_login(app_and_client):
    """Test addcharacter POST requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.post("/addcharacter", data={
        "name": "Test",
        "nickname": "T",
        "fandom": "Test",
        "pic": "/static/images/default.png"
    }, follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_deletecharacter_requires_login(app_and_client):
    """Test deletecharacter requires authentication."""
    app, client, fake_db = app_and_client
    
    # Not logged in
    resp = client.post("/deletecharacter/507f1f77bcf86cd799439011", follow_redirects=True)
    # Should redirect to login page
    assert resp.status_code == 200
    assert "TEMPLATE:login.html" in resp.get_data(as_text=True)

def test_deletecharacter_success(app_and_client):
    """Test successful character deletion."""
    app, client, fake_db = app_and_client
    
    # Create user with character
    char_id = ObjectId()
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [{
            "_id": char_id,
            "name": "Test Char",
            "nickname": "TC",
            "fandom": "Test",
            "pic": "/static/images/default.png"
        }],
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Delete character
    resp = client.post(f"/deletecharacter/{char_id}", follow_redirects=False)
    assert resp.status_code in (302, 303)
    
    # Verify character was removed
    user_after = fake_db.users.find_one({"_id": user_oid})
    assert len(user_after.get("characters", [])) == 0

def test_deletecharacter_not_found(app_and_client):
    """Test deleting non-existent character."""
    app, client, fake_db = app_and_client
    
    # Create user without the character
    user_doc = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "pw",
        "characters": [],  # No characters
        "threads": []
    }
    res = fake_db.users.insert_one(user_doc)
    user_oid = res.inserted_id
    
    # Login
    with client.session_transaction() as sess:
        sess["_user_id"] = str(user_oid)
    
    # Try to delete non-existent character
    non_existent_id = "507f1f77bcf86cd799439999"
    resp = client.post(f"/deletecharacter/{non_existent_id}", follow_redirects=True)
    # Should still redirect but flash error message
    assert resp.status_code == 200


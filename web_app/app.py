import os
from bson import ObjectId
from bson.errors import InvalidId
from json import JSONEncoder
import json
from flask import Flask, redirect, render_template, request, url_for, flash, jsonify
from pymongo import MongoClient
from flask_login import LoginManager, login_user, logout_user, current_user, login_required
from models import User
from dotenv import load_dotenv
from datetime import datetime
load_dotenv()

login_manager = LoginManager()
class MongoJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        # Handle datetime objects (optional, but good practice)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def create_app(testing=False):
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    app.secret_key = os.getenv("SECRET_KEY")
    app.json_encoder = MongoJSONEncoder
    login_manager.init_app(app)
    login_manager.login_view = "login" 

    if testing:
        app.config["TESTING"] = True
        app.db = None   # tests monkeypatch DB anyway
    else:
        # client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
        MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        print("MONGO URI I AM USING:", MONGO_URI)
        client = MongoClient(MONGO_URI)
        db_name = os.getenv("DB_NAME", "forum_db")
        app.db = client[db_name]

        try:
            client.admin.command("ping")
            print(" * Connected to MongoDB!")
            print(" * Using DB:", app.db.name)
            print(" * Users count:", app.db.users.count_documents({}))
        except Exception as e:
            print(" * MongoDB connection error:", e)

    @login_manager.user_loader
    def load_user(user_id):
        db_user = app.db.users.find_one({"_id": ObjectId(user_id)})
        return User(db_user) if db_user else None
    
    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == "POST":
            email = request.form.get("email")
            password = request.form.get("password")

            if not email or not password:
                flash("Please fill in both fields!")
                return redirect(url_for("login"))
            
            db_email = app.db.users.find_one({"email": email})
            # no such user
            if not db_email:
                flash("Email not registered.")
                return redirect(url_for("login"))
            
            if db_email["password"] == password:
                user = User(db_email)
                login_user(user)              
                return redirect(url_for("profile"))
            else:
                flash("Wrong password!")
                return redirect(url_for("login"))
            
        return render_template("login.html")
    
    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect(url_for("index"))

    @app.route('/register', methods = ['GET', 'POST'])
    def register():
        if request.method == 'POST':
            username = request.form.get("username")
            email = request.form.get("email")
            password = request.form.get("password")
            confirm_password = request.form.get("confirm-password")

            if not username or not email or not password:
                flash("Please fill in all fields!")
                return redirect(url_for("register"))
            
            if password != confirm_password:
                flash("Passwords do not match!")
                return redirect(url_for("register"))
            
            db_email = app.db.users.find_one({"email": email})
            if db_email:
                flash("Email already registered!")
                return redirect(url_for("register"))
        
            new_user = ({
                "username": username,
                "email": email,
                "password": password,
                "characters": [],
                "threads": [],
            })
            doc = app.db.users.insert_one(new_user)

            user_doc = app.db.users.find_one({"_id": doc.inserted_id})
            user = User(user_doc)
            login_user(user)

            return redirect(url_for("profile"))
        return render_template("register.html")
    
    @app.route("/profile")
    @login_required
    def profile():
        userdata = app.db.users.find_one({"_id": ObjectId(current_user.id)})
        return render_template("profile.html", user = userdata)
    
    @app.route("/forum")
    def forum():
        return render_template("forum.html")
    
    @app.route("/viewthread/<thread_id>")
    def viewthread(thread_id):
        return render_template("viewthread.html")
    
    @app.route("/api/thread/<thread_id>")
    def get_thread(thread_id):
        try:
            thread_oid = ObjectId(thread_id)
        except InvalidId:
            return jsonify({"ok": False, "error": "Invalid thread id"}), 400
        
        thread = app.db.forums.find_one({"_id": thread_oid})
        if not thread:
            return jsonify({"ok": False, "error": "Thread not found"}), 404
        
        status = thread.get("status", "draft")
        owner = thread.get("user_id")
        
        if status != "published":
            if not current_user.is_authenticated or owner != ObjectId(current_user.id):
                return jsonify({"ok": False, "error": "Thread not visible to you"}), 403
        
        thread_data = {
            "id": str(thread.get("_id")),
            "title": thread.get("title", ""),
            "status": status,
            "posts": thread.get("posts", []),
            "characters": thread.get("characters", []),
            "updated_at": thread.get("updated_at").isoformat() if thread.get("updated_at") else None,
            "created_at": thread.get("created_at").isoformat() if thread.get("created_at") else None,
        }
        
        return jsonify({"ok": True, "thread": thread_data})
    
    #character routes
    @app.route("/characters")
    @login_required
    def characters():
        q = request.args.get("q", "").strip()
        user = app.db.users.find_one({"_id": ObjectId(current_user.id)})
        characters = user.get("characters", [])

        if q:
            characters = [char for char in characters 
                          if q.lower() in char.get("name", "").lower() 
                          or q.lower() in char.get("nickname", "").lower() 
                          or q.lower() in char.get("fandom", "").lower()]
            
        return render_template("characters.html", characters=characters, query=q)
    
    @app.route("/addcharacter", methods = ['GET', 'POST'])
    @login_required
    def addcharacter():
        if request.method == 'GET':
            char_id = request.args.get("id")
            character = None
            if char_id:
                user = app.db.users.find_one(
                    {"_id": ObjectId(current_user.id),
                    "characters._id": ObjectId(char_id)},
                    {"characters.$": 1}
                )
                if user and "characters" in user:
                    character = user["characters"][0]
            return render_template("addcharacter.html", character=character)
        char_id = request.form.get("id")
        name = request.form.get("name", "Uknown character")
        nickname = request.form.get("nickname", name)
        fandom = request.form.get("fandom", "Original character")
        pic = request.form.get("pic", "/static/images/default.png")

        if char_id:
            app.db.users.update_one(
                {"_id": ObjectId(current_user.id), "characters._id": ObjectId(char_id)},
                {"$set": {
                    "characters.$.name": name,
                    "characters.$.nickname": nickname,
                    "characters.$.fandom": fandom,
                    "characters.$.pic": pic,
                }}
            )
        else:
            character_id = ObjectId()
            character = ({
                "_id": character_id,
                "name": name,
                "nickname": nickname,
                "fandom": fandom,
                "pic": pic
            })
            app.db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {"$push": {"characters": character}}
            )
        
        return redirect(url_for("characters"))
    
    @app.route("/api/db_characters")
    @login_required
    def api_db_characters():
        user = app.db.users.find_one({"_id": ObjectId(current_user.id)})
        char_doc = user.get("characters", [])
        characters = []
        for char in char_doc:
            characters.append({
                "_id": str(char.get("_id")),
                "name": char.get("name", ""),
                "nickname": char.get("nickname", ""),
                "fandom": char.get("fandom", ""),
                "pic": char.get("pic", "/static/images/default.png")
            })
        return jsonify({"ok": True, "characters": characters})

    @app.route("/deletecharacter/<char_id>", methods=['POST'])
    @login_required
    def deletecharacter(char_id):
        result = app.db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$pull": {"characters": {"_id": ObjectId(char_id)}}}
        )
        if result.modified_count == 0:
            flash("Character not found or could not be deleted.")
        else:
            flash("Character deleted successfully.")
        return redirect(url_for("characters"))
        
    
    @app.route("/createforum", methods=['GET', 'POST'])
    @login_required
    def createforum():
        if request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({"ok": False, "error": "Expected JSON body"}), 400
            
            title = (data.get("title", "Untitled")).strip()
            status = data.get("status", "draft")
            posts_data = data.get("posts", [])
            thread_id = data.get("id")
            if not title:
                return jsonify({"ok": False, "error": "Title is required"}), 400
            if not posts_data:
                return jsonify({"ok": False, "error": "At least one post is required"}), 400
            
            now = datetime.utcnow()

            # Validate posts against user characters and build character snapshot
            user_doc = app.db.users.find_one({"_id": ObjectId(current_user.id)})
            user_characters = user_doc.get("characters", []) if user_doc else []
            if not user_characters:
                return jsonify({"ok": False, "error": "You have no characters; add one first."}), 400

            character_lookup = {str(c.get("_id")): c for c in user_characters}
            sanitized_posts = []
            unique_chars = {}
            for idx, post in enumerate(posts_data):
                char_index = post.get("characterIndex")
                try:
                    char_index = int(char_index)
                except Exception:
                    return jsonify({"ok": False, "error": f"Invalid character index in post {idx+1}"}), 400
                if char_index < 0 or char_index >= len(user_characters):
                    return jsonify({"ok": False, "error": f"Character index out of range in post {idx+1}"}), 400
                char_info = user_characters[char_index]

                nickname = (post.get("nickname") or char_info.get("nickname") or "").strip()
                avatar = post.get("avatar") or char_info.get("pic") or "/static/images/default.png"
                content = (post.get("content") or "").strip()
                floor = post.get("floor") or (idx + 1)

                if not content:
                    return jsonify({"ok": False, "error": f"Content required for post {idx+1}"}), 400

                sanitized_posts.append({
                    "characterIndex": char_index,
                    "character_id": str(char_info.get("_id")),
                    "character_name": char_info.get("name", ""),
                    "character_fandom": char_info.get("fandom", ""),
                    "nickname": nickname,
                    "avatar": avatar,
                    "content": content,
                    "floor": floor
                })

                char_key = str(char_info.get("_id"))
                if char_key not in unique_chars:
                    unique_chars[char_key] = {
                        "_id": char_key,
                        "name": char_info.get("name", ""),
                        "nickname": char_info.get("nickname", ""),
                        "fandom": char_info.get("fandom", ""),
                        "pic": char_info.get("pic", "/static/images/default.png")
                    }

            thread = {
                "user_id": ObjectId(current_user.id),
                "title": title,
                "status": status,
                "posts": sanitized_posts,
                "characters": list(unique_chars.values()),
                "updated_at": now,
                "published_at": now if status == "published" else None,
            }

            if thread_id:
                try:
                    thread_oid = ObjectId(thread_id)
                except Exception:
                    return jsonify({"ok": False, "error": "Invalid thread id"}), 400
                
                result = app.db.forums.update_one(
                    {"_id": thread_oid, "user_id": ObjectId(current_user.id)},
                    {"$set": thread}
                )
                if result.matched_count == 0:
                    return jsonify({"ok": False, "error": "Thread not found"}), 404
                
                return jsonify({"ok": True, "id": str(thread_oid)})
            
            thread["created_at"] = now
            thread = app.db.forums.insert_one(thread)
            app.db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {"$push": {"threads": thread.inserted_id}}
            )
            return jsonify({"ok": True, "id": str(thread.inserted_id)})
                
        else:
            user = app.db.users.find_one({"_id": ObjectId(current_user.id)})
            characters = user.get("characters", [])

            # --- DEBUGGING LINES ---
            print(f"DEBUG: Current User ID: {current_user.id}", flush=True)
            print(f"DEBUG: Raw Characters found in DB: {len(characters)}", flush=True)
            print(f"DEBUG: First character data: {characters[0] if characters else 'None'}", flush=True)

            characters_json_string = json.dumps(characters, cls=app.json_encoder)
            
            app.logger.info(f"Generated JSON string length: {len(characters_json_string)}")

            return render_template("createforum.html", characters=characters, characters_json=characters_json_string)
    
    @app.route("/api/my_forums")
    @login_required
    def my_forums():
        status = request.args.get("status")
        q = request.args.get("q")
        
        query = {"user_id": ObjectId(current_user.id)}

        if status in ["draft", "published"]:
            query["status"] = status

        if q:
            regex = {"$regex": q, "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"characters.name": regex},
                {"characters.nickname": regex},
                {"characters.fandom": regex},
            ]

        cursor = app.db.forums.find(query).sort("updated_at", -1)
        forums = []
        for doc in cursor:
            # Get user info for consistency
            user_id = doc.get("user_id")
            author_username = "Anonymous"
            
            if user_id:
                user = app.db.users.find_one({"_id": user_id})
                if user:
                    author_username = user.get("username", "Anonymous")

            forums.append({
                "id": str(doc.get("_id")),
                "title": doc.get("title", ""),
                "status": doc.get("status", "draft"),
                "post_count": len(doc.get("posts", [])),
                "characters": doc.get("characters", []),
                "author_username": author_username,  # Add this field
                "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
                "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            })
        return jsonify({"ok": True, "forums": forums})
    
    @app.route("/api/my_forums/<thread_id>", methods=["GET", "DELETE"])
    @login_required
    def api_my_forum(thread_id):
        try:
            thread_oid = ObjectId(thread_id)
        except InvalidId:
            return jsonify({"ok": False, "error": "Invalid thread id"}), 400

        if request.method == "DELETE":
            result = app.db.forums.delete_one({
                "_id": thread_oid,
                "user_id": ObjectId(current_user.id)
            })
            if result.deleted_count == 0:
                return jsonify({"ok": False, "error": "Thread not found"}), 404
            app.db.users.update_one(
                {"_id": ObjectId(current_user.id)},
                {"$pull": {"threads": thread_oid}}
            )
            return jsonify({"ok": True})

        thread = app.db.forums.find_one({"_id": thread_oid, "user_id": ObjectId(current_user.id)})
        if not thread:
            return jsonify({"ok": False, "error": "Thread not found"}), 404

        thread_data = {
            "id": str(thread.get("_id")),
            "title": thread.get("title", ""),
            "status": thread.get("status", "draft"),
            "posts": thread.get("posts", []),
            "characters": thread.get("characters", []),
            "updated_at": thread.get("updated_at").isoformat() if thread.get("updated_at") else None,
            "created_at": thread.get("created_at").isoformat() if thread.get("created_at") else None,
        }
        return jsonify({"ok": True, "thread": thread_data})


    @app.route("/api/my_characters")
    @login_required
    def api_my_characters():
        user = app.db.users.find_one({"_id": ObjectId(current_user.id)})
        characters = user.get("characters", [])
        return jsonify({"ok": True, "characters": characters})
    
    @app.route("/api/published_forums")
    def api_published_forums():
        q = request.args.get("q")

        query = {"status": "published"}

        if q:
            regex = {"$regex": q, "$options": "i"}
            query["$or"] = [
                {"title": regex},
                {"characters.name": regex},
                {"characters.nickname": regex},
                {"characters.fandom": regex},
            ]

        cursor = app.db.forums.find(query).sort("published_at", -1)

        forums = []
        for t in cursor:
            # Get user info from the user_id
            user_id = t.get("user_id")
            author_username = "Anonymous"
            
            if user_id:
                user = app.db.users.find_one({"_id": user_id})
                if user:
                    author_username = user.get("username", "Anonymous")

            forums.append({
                "id": str(t["_id"]),
                "title": t.get("title", "Untitled"),
                "post_count": len(t.get("posts", [])),
                "characters": t.get("characters", []),
                "author_username": author_username,  # Add this field
                "created_at": t.get("created_at").isoformat() if t.get("created_at") else None,
                "published_at": t.get("published_at").isoformat() if t.get("published_at") else None,
            })

        return jsonify({"ok": True, "forums": forums})
    
    @app.route("/community")
    def community():
        return render_template("community.html")
    
    @app.route("/api/community")
    def api_community():
        cursor = app.db.forums.find({"status": "published"}).sort("published_at", -1)
        forums = []
        for doc in cursor:
            # Get user info
            user_id = doc.get("user_id")
            author_username = "Anonymous"
            
            if user_id:
                user = app.db.users.find_one({"_id": user_id})
                if user:
                    author_username = user.get("username", "Anonymous")
                    
            forums.append({
                "id": str(doc.get("_id")),
                "title": doc.get("title", ""),
                "status": doc.get("status", "draft"),
                "characters": doc.get("characters", []),
                "author_username": author_username,  # Add this field
                "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
                "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            })
        return jsonify({"ok": True, "forums": forums})
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)

import os
from bson import ObjectId
from flask import Flask, redirect, render_template, request, url_for, flash
from pymongo import MongoClient
from flask_login import LoginManager, login_user, logout_user, current_user, login_required
from models import User
from dotenv import load_dotenv
load_dotenv()

login_manager = LoginManager()

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    app.secret_key = os.getenv("SECRET_KEY")
    login_manager.init_app(app)
    login_manager.login_view = "login" 

    client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    app.db = client[os.getenv("DB_NAME", "default_db")]

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
    
    @app.route("/viewthread")
    def viewthread():
        return render_template("viewthread.html")
        
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)

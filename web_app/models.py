from flask_login import UserMixin

class User(UserMixin):
    def __init__(self, doc):
        self.id = str(doc.get("_id"))
        self.username = doc.get("username", "")
        self.email = doc.get("email", "")
        self.password = doc.get("password", "")
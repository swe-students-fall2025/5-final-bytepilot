# tests/test_app.py
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from bson import ObjectId

# Add the parent directory to Python path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import User


class TestAppRoutes(unittest.TestCase):
    """Test Flask routes functionality."""

    def setUp(self):
        """Set up test client for each test."""
        # Mock the MongoDB connection
        self.mock_mongo_patcher = patch('app.MongoClient')
        self.mock_mongo_client = self.mock_mongo_patcher.start()
        
        # Mock MongoDB instances
        self.mock_client_instance = MagicMock()
        self.mock_db = MagicMock()
        self.mock_mongo_client.return_value = self.mock_client_instance
        self.mock_client_instance.__getitem__.return_value = self.mock_db

        # Create app and test client
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['WTF_CSRF_ENABLED'] = False
        self.client = self.app.test_client()

    def tearDown(self):
        """Clean up after each test."""
        self.mock_mongo_patcher.stop()

    def test_index_route(self):
        """Test the index page loads successfully."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_login_page_get(self):
        """Test login page GET request."""
        response = self.client.get('/login')
        self.assertEqual(response.status_code, 200)

    def test_login_successful(self):
        """Test successful user login."""
        # Mock user data
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword"
        }
        self.mock_db.users.find_one.return_value = user_data

        response = self.client.post('/login', data={
            'email': 'test@example.com',
            'password': 'testpassword'
        }, follow_redirects=False)

        # Should redirect to profile page
        self.assertEqual(response.status_code, 302)
        self.mock_db.users.find_one.assert_called_once_with({"email": "test@example.com"})

    def test_login_missing_fields(self):
        """Test login with missing fields."""
        response = self.client.post('/login', data={
            'email': '',
            'password': 'password'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        # Should show error message (flash message)

    def test_login_nonexistent_user(self):
        """Test login with non-existent email."""
        self.mock_db.users.find_one.return_value = None

        response = self.client.post('/login', data={
            'email': 'nonexistent@example.com',
            'password': 'password'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.mock_db.users.find_one.assert_called_once_with({"email": "nonexistent@example.com"})

    def test_login_wrong_password(self):
        """Test login with wrong password."""
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "correctpassword"  # Different from submitted password
        }
        self.mock_db.users.find_one.return_value = user_data

        response = self.client.post('/login', data={
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)

    def test_register_page_get(self):
        """Test register page GET request."""
        response = self.client.get('/register')
        self.assertEqual(response.status_code, 200)

    def test_register_successful(self):
        """Test successful user registration."""
        # Mock: No existing user with this email
        self.mock_db.users.find_one.return_value = None
        
        # Mock insert operation
        mock_insert_result = MagicMock()
        mock_insert_result.inserted_id = ObjectId("507f1f77bcf86cd799439011")
        self.mock_db.users.insert_one.return_value = mock_insert_result
        
        # Mock the user lookup after insertion
        new_user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "newuser",
            "email": "new@example.com",
            "password": "newpassword"
        }
        self.mock_db.users.find_one.return_value = new_user_data

        response = self.client.post('/register', data={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpassword',
            'confirm-password': 'newpassword'
        }, follow_redirects=False)

        # Should redirect to profile page
        self.assertEqual(response.status_code, 302)
        
        # Verify database was called to check for existing email
        self.mock_db.users.find_one.assert_called_with({"email": "new@example.com"})

    def test_register_missing_fields(self):
        """Test registration with missing fields."""
        response = self.client.post('/register', data={
            'username': '',
            'email': 'test@example.com',
            'password': 'password',
            'confirm-password': 'password'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)

    def test_register_password_mismatch(self):
        """Test registration with password mismatch."""
        response = self.client.post('/register', data={
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'password1',
            'confirm-password': 'password2'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)

    def test_register_existing_email(self):
        """Test registration with existing email."""
        existing_user = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "existinguser",
            "email": "existing@example.com",
            "password": "password"
        }
        self.mock_db.users.find_one.return_value = existing_user

        response = self.client.post('/register', data={
            'username': 'newuser',
            'email': 'existing@example.com',
            'password': 'password',
            'confirm-password': 'password'
        }, follow_redirects=True)

        self.assertEqual(response.status_code, 200)
        self.mock_db.users.find_one.assert_called_once_with({"email": "existing@example.com"})

    def test_logout_requires_login(self):
        """Test logout route requires authentication."""
        response = self.client.get('/logout', follow_redirects=True)
        # Should redirect to login page
        self.assertEqual(response.status_code, 200)

    def test_profile_requires_login(self):
        """Test profile route requires authentication."""
        response = self.client.get('/profile', follow_redirects=True)
        # Should redirect to login page
        self.assertEqual(response.status_code, 200)

    def test_public_routes_accessible(self):
        """Test all public routes are accessible without login."""
        public_routes = [
            '/forum',
            '/viewthread',
            '/createforum', 
            '/community',
            '/addcharacter',
            '/characters'
        ]
        
        for route in public_routes:
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, 200)

    def test_invalid_route_returns_404(self):
        """Test accessing non-existent route returns 404."""
        response = self.client.get('/nonexistent-route')
        self.assertEqual(response.status_code, 404)


class TestUserModel(unittest.TestCase):
    """Test User model functionality."""

    def test_user_creation(self):
        """Test User object creation with valid data."""
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword"
        }
        
        user = User(user_data)
        
        self.assertEqual(user.id, "507f1f77bcf86cd799439011")
        self.assertEqual(user.username, "testuser")
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.password, "testpassword")

    def test_user_get_id(self):
        """Test User get_id method."""
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword"
        }
        
        user = User(user_data)
        self.assertEqual(user.get_id(), "507f1f77bcf86cd799439011")

    def test_user_is_authenticated(self):
        """Test User is_authenticated property."""
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword"
        }
        
        user = User(user_data)
        self.assertTrue(user.is_authenticated)

    def test_user_is_active(self):
        """Test User is_active property."""
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword"
        }
        
        user = User(user_data)
        self.assertTrue(user.is_active)

    def test_user_is_anonymous(self):
        """Test User is_anonymous property."""
        user_data = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword"
        }
        
        user = User(user_data)
        self.assertFalse(user.is_anonymous)


class TestAppConfiguration(unittest.TestCase):
    """Test app configuration."""

    @patch('app.MongoClient')
    def test_app_creation_with_env_variables(self, mock_mongo_client):
        """Test app creation uses environment variables."""
        with patch.dict(os.environ, {
            'SECRET_KEY': 'test-secret',
            'MONGO_URI': 'mongodb://test:27017/',
            'DB_NAME': 'test_db'
        }):
            mock_client = MagicMock()
            mock_db = MagicMock()
            mock_mongo_client.return_value = mock_client
            mock_client.__getitem__.return_value = mock_db

            app = create_app()
            
            self.assertEqual(app.secret_key, 'test-secret')
            mock_mongo_client.assert_called_once_with('mongodb://test:27017/')
            mock_client.__getitem__.assert_called_once_with('test_db')

    @patch('app.MongoClient')
    def test_app_creation_with_defaults(self, mock_mongo_client):
        """Test app creation uses default values when env vars not set."""
        with patch.dict(os.environ, {}, clear=True):
            mock_client = MagicMock()
            mock_db = MagicMock()
            mock_mongo_client.return_value = mock_client
            mock_client.__getitem__.return_value = mock_db

            app = create_app()
            
            self.assertIsNone(app.secret_key)  # Not set in env
            mock_mongo_client.assert_called_once_with('mongodb://localhost:27017')
            mock_client.__getitem__.assert_called_once_with('default_db')


if __name__ == '__main__':
    unittest.main()
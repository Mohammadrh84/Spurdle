import unittest

from app import create_app
from app.config import TestConfig
from app.forms import LoginForm, SignupForm


class TestForms(unittest.TestCase):

    def setUp(self):
        self.app = create_app(TestConfig)

    # ensure a password following the validators passes
    def test_signup_form_accepts_valid_data(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user123",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertTrue(form.validate())

    # ensure usernames that are too short are rejected
    def test_short_username(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertFalse(form.validate())

    # make sure passwords too short are rejected
    def test_short_password(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user123",
                password="test",
                confirm="test"
            )

            self.assertFalse(form.validate())

    # make sure it rejects if there are no special characters
    def test_special_chars(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user123",
                password="testpassword67",
                confirm="testpassword67"
            )

            self.assertFalse(form.validate())

    # make sure empty usernames are rejected
    def test_empty_username(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertFalse(form.validate())

    # make sure form rejects if two passwords are different
    def test_mismatched_passwords(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="testuser",
                password="testpassword67#",
                confirm="differentpassword67#"
            )

            self.assertFalse(form.validate())

    # make sure the login form accepts correct information
    def test_login_form_accepts_valid_data(self):
        with self.app.test_request_context():
            form = LoginForm(
                username="user123",
                password="testpassword67#"
            )

            self.assertTrue(form.validate())

    # make sure the login form rejects an empty password
    def test_empty_password(self):
        with self.app.test_request_context():
            form = LoginForm(
                username="user123",
                password=""
            )

            self.assertFalse(form.validate())


if __name__ == "__main__":
    unittest.main()
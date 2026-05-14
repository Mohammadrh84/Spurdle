import unittest

from app import create_app
from app.config import TestConfig
from app.forms import LoginForm, SignupForm


class TestForms(unittest.TestCase):

    def setUp(self):
        self.app = create_app(TestConfig)

    def test_signup_form_accepts_valid_data(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user123",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertTrue(form.validate())

    def test_signup_form_rejects_short_username(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertFalse(form.validate())

    def test_signup_form_rejects_short_password(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user123",
                password="test",
                confirm="test"
            )

            self.assertFalse(form.validate())

    def test_signup_form_rejects_password_without_special_character(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="user123",
                password="testpassword67",
                confirm="testpassword67"
            )

            self.assertFalse(form.validate())

    def test_signup_form_rejects_empty_username(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertFalse(form.validate())

    def test_signup_form_rejects_mismatched_password_confirmation(self):
        with self.app.test_request_context():
            form = SignupForm(
                username="testuser",
                password="testpassword67#",
                confirm="differentpassword67#"
            )

            self.assertFalse(form.validate())

    def test_login_form_accepts_valid_data(self):
        with self.app.test_request_context():
            form = LoginForm(
                username="user123",
                password="testpassword67#"
            )

            self.assertTrue(form.validate())

    def test_login_form_rejects_empty_password(self):
        with self.app.test_request_context():
            form = LoginForm(
                username="user123",
                password=""
            )

            self.assertFalse(form.validate())


if __name__ == "__main__":
    unittest.main()
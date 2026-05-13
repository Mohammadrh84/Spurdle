import unittest
from app import create_app
from app.forms import SignupForm, LoginForm
from app.config import TestConfig

class TestForms(unittest.TestCase):

    def setUp(self):
        self.app = create_app(TestConfig)
    
    def test_signup_form(self):
        with self.app.test_request_context():
            # ensure if requirements are met users can sign up
            valid_form = SignupForm(
                username="user123",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertTrue(valid_form.validate())


            # make sure usernames are constrained to character limit / requirement
            bad_user_form = SignupForm(
                username="user",
                password="testpassword67#",
                confirm="testpassword67#"
            )

            self.assertFalse(bad_user_form.validate())

            # testing violating validators (password too short)
            bad_password_form = SignupForm(
                username="user123",
                password="test",
                confirm="test"
            )

            self.assertFalse(bad_password_form.validate())

            # testing violating validators (empty username)
            empty_form = SignupForm(
                username="",
                password="test",
                confirm="test"
            )

            self.assertFalse(empty_form.validate())

    def test_login_form_valid(self):
        with self.app.test_request_context():
            # validates as long as fields are not empty
            valid_form = LoginForm(
                username="user123",
                password="testpassword67#"
            )

            self.assertTrue(valid_form.validate())

            empty_form = LoginForm(
                username="user",
                password=""
            )

            self.assertFalse(empty_form.validate())
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from app.config import TestConfig
from app.models import db, User, Stats
from app import create_app
from werkzeug.security import generate_password_hash


BASE_URL = "http://127.0.0.1:5000"


class TestAuthSelenium(unittest.TestCase):

    def setUp(self):
        # Create test database so users are not stored in the main game database
        self.app = create_app(TestConfig)

        with self.app.app_context():
            db.drop_all()
            db.create_all()

        self.driver = webdriver.Chrome()
        self.driver.get(BASE_URL)

    def test_signup(self):
        driver = self.driver

        driver.get(f"{BASE_URL}/sign_up")

        driver.find_element(By.NAME, "username").send_keys("testuser")
        driver.find_element(By.NAME, "password").send_keys("testuserpw67#")
        driver.find_element(By.NAME, "confirm").send_keys("testuserpw67#")

        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()

        WebDriverWait(driver, 5).until(
            EC.url_contains("sign_in")
        )

        self.assertIn("sign_in", driver.current_url)

    def test_invalid_signup_stays_on_signup_page(self):
        driver = self.driver

        driver.get(f"{BASE_URL}/sign_up")

        driver.find_element(By.NAME, "username").send_keys("bad")
        driver.find_element(By.NAME, "password").send_keys("weak")
        driver.find_element(By.NAME, "confirm").send_keys("weak")

        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()

        WebDriverWait(driver, 5).until(
            EC.url_contains("sign_up")
        )

        self.assertIn("sign_up", driver.current_url)

    def signin(self, username, password):
        # Add specified user information to the database so signin is possible
        with self.app.app_context():
            user = User(
                username=username,
                password=generate_password_hash(password)
            )

            db.session.add(user)
            db.session.commit()

        driver = self.driver

        driver.get(f"{BASE_URL}/sign_in")

        driver.find_element(By.NAME, "username").send_keys(username)
        driver.find_element(By.NAME, "password").send_keys(password)

        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()

        WebDriverWait(driver, 5).until(
            EC.url_contains("select_artists")
        )

    def select_artist_drake(self):
        driver = self.driver

        # wait to make sure artist search is visible
        search_box = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.ID, "artistSearch"))
        )

        search_box.send_keys("Drake")

        # wait for api to respond to search
        artist_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((
                By.XPATH,
                "//button[.//p[text()='Drake']]"
            ))
        )

        artist_button.click()

        save_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.ID, "saveArtistsButton"))
        )

        # click the save / start game button
        save_button.click()

        # ensure we moved over to the main game
        WebDriverWait(driver, 5).until(
            EC.url_contains("main_game")
        )

    def test_signin(self):
        driver = self.driver

        self.signin("john532", "password67#")

        # after signing in the user should be taken to the select artists page
        self.assertIn("select_artists", driver.current_url)

    def test_logout(self):
        driver = self.driver

        self.signin("logoutuser", "password67#")

        driver.get(f"{BASE_URL}/logout")

        WebDriverWait(driver, 5).until(
            EC.url_contains("sign_in")
        )

        self.assertIn("sign_in", driver.current_url)

    def test_select_artist(self):
        driver = self.driver

        self.signin("john532", "password67#")

        self.select_artist_drake()

        self.assertIn("main_game", driver.current_url)

    def test_main_game(self):
        driver = self.driver

        self.signin("john532", "password67#")

        self.select_artist_drake()

        # test that all hints are properly revealed
        reveal_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Reveal Hint')]"))
        )

        for _ in range(5):
            reveal_button.click()

        # test that users can give up
        give_up = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Give up?')]"))
        )

        give_up.click()

        # ensure results are shown after user gives up
        WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "result-overlay"))
        )

        self.assertTrue(driver.find_element(By.ID, "result-overlay").is_displayed())

    def test_leaderboard(self):
        driver = self.driver

        self.signin("sampleuser", "password67#")

        # edit the stats of the user just created through the login helper function
        with self.app.app_context():
            user = User.query.filter_by(username="sampleuser").first()

            stats = Stats(
                user_id=user.id,
                total_points=250,
                accuracy=0.75,
                games_played=4,
                avg_hints=2.5,
                current_streak=3,
                best_streak=5
            )

            db.session.add(stats)
            db.session.commit()

        driver.get(f"{BASE_URL}/leaderboard")

        # check to make sure user appears on leaderboard
        WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'sampleuser')]"))
        )

        page_source = driver.page_source

        self.assertIn("sampleuser", page_source)

        # check if key stats are showing up on the leaderboard with the user:
        # points
        self.assertIn("250", page_source)

        # accuracy
        self.assertIn("75%", page_source)

        # games played
        self.assertIn("4", page_source)

    def tearDown(self):
        self.driver.quit()


if __name__ == "__main__":
    unittest.main()
import unittest
from app.routes import filter_song_name, get_itunes_artist_id, clean_selected_artist, parse_selected_artists, is_valid_song
import json
from unittest.mock import patch


class TestRoutes(unittest.TestCase):

    def test_filter_song_name(self):
        # test different formats of song names and ensure they are filtered properly
        self.assertEqual(
            filter_song_name("Song Name (Remix)"),
            "Song Name"
        )
        self.assertEqual(
            filter_song_name("Hello [Live]"),
            "Hello"
        )

        self.assertEqual(
            filter_song_name("Song {Demo}"),
            "Song"
        )

    def test_filter_song_name_removes_multiple_bracket_sections(self):
        self.assertEqual(
            filter_song_name("Song Name (Live) [Acoustic] {Demo}"),
            "Song Name"
        )

    def test_filter_song_name_keeps_plain_song_name(self):
        self.assertEqual(
            filter_song_name("Normal Song"),
            "Normal Song"
        )

    def test_filter_song_name_removes_extra_spaces(self):
        self.assertEqual(
            filter_song_name("Song   Name   (Remix)"),
            "Song Name"
        )

    @patch("app.routes.requests.get")
    def test_get_itunes_artist_id_returns_artist_id_from_response(self, mock_get):
        mock_get.return_value.json.return_value = {
            "results": [
                {"artistId": 909253}
            ]
        }

        result = get_itunes_artist_id("Test Artist")

        self.assertEqual(result, 909253)

    @patch("app.routes.requests.get")
    def test_get_itunes_artist_id_returns_none_when_no_results(self, mock_get):
        mock_get.return_value.json.return_value = {
            "results": []
        }

        result = get_itunes_artist_id("Test Artist")

        self.assertIsNone(result)

    @patch("app.routes.requests.get")
    def test_get_itunes_artist_id_uses_existing_artist_id_without_api_call(self, mock_get):
        result = get_itunes_artist_id("Test Artist", artist_id="12345")

        self.assertEqual(result, "12345")
        mock_get.assert_not_called()

    @patch("app.routes.requests.get")
    def test_get_itunes_artist_id_returns_none_for_empty_artist_name(self, mock_get):
        result = get_itunes_artist_id("")

        self.assertIsNone(result)
        mock_get.assert_not_called()

    def test_clean_selected_artist(self):
        # test for cases where artist information may have whitespace
        artist = {
            "id": " 123",
            "name": " Test Artist ",
            "image": "img.jpg"
        }

        cleaned_artist = {
            "id": "123",
            "name": "Test Artist",
            "image": "img.jpg"
        }

        result = clean_selected_artist(artist)
        self.assertEqual(cleaned_artist, result)

        # test again for cases where the artist information is empty and ensure None is returned
        empty_artist = {}

        empty_result = clean_selected_artist(empty_artist)
        self.assertIsNone(empty_result)

    def test_parse_selected_artists(self):
        valid_selected_artists = json.dumps([
            {"id": "1", "name": "Test Artist 1"},
            {"id": "2", "name": "Test Artist 2"}
        ])

        valid_result = parse_selected_artists(valid_selected_artists)
        # ensure valid artist information is stored and retrieved properly
        self.assertEqual(len(valid_result), 2)
        self.assertEqual(valid_result[0]["id"], "1")
        self.assertEqual(valid_result[1]["id"], "2")

        # account for cases where ID may be null and there are duplicate artists
        invalid_selected_artists = json.dumps([
            {"id": "", "name": "Test Artist 1"},
            {"id": "2", "name": "Test Artist 2"},
            {"id": "2", "name": "Duplicate ID"}
        ])

        invalid_result = parse_selected_artists(invalid_selected_artists)

        # ensure the invalid entries were removed and the correct one stays
        self.assertEqual(len(invalid_result), 1)
        self.assertEqual(invalid_result[0]["id"], "2")

    def test_valid_song(self):
        valid_song = {
            "wrapperType": "track",
            "artistId": 123,
            "trackName": "Normal Song"
        }

        self.assertTrue(is_valid_song(valid_song, 123))
        # make sure it rejects albums and other incorrect wrapper types
        album = {
            "wrapperType": "album",
            "albumId": 123,
            "albumName": "Random Album"
        }

        self.assertFalse(is_valid_song(album, 123))

        # ensure that the expected id always lines up
        incorrect_id = {
            "wrapperType": "track",
            "artistId": 124,
            "trackName": "Bad Song"
        }

        self.assertFalse(is_valid_song(incorrect_id, 123))

        # ensure remixes are excluded
        remix_song = {
            "wrapperType": "track",
            "artistId": 123,
            "trackName": "Normal Song (Remix)"
        }

        self.assertFalse(is_valid_song(remix_song, 123))


if __name__ == "__main__":
    unittest.main()
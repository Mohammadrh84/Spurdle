# Spurdle

Spurdle is a music guessing game where you specify your favourite artists and have to guess a random song of theirs based on numerous hints. Guessing with less hints will reward the player with more points, with the highest scoring players being placed on a leaderboard tab so people can interact with others and view their scores.

## Group Member Information

| UWA ID   | Name                | GitHub Username |
| -------- | ------------------- | --------------- |
| 24271659 | Nathan Flack        | nathanjstack    |
| 24364632 | Dhruv Bharuth       | BotDurv         |
| 24443565 | Mohammad Haddadpour | Mohammadrh84    |
| 24197094 | Surtaj Singh        | taj-sketch      |

## Running the Project Locally

### Prerequisites

- Python 3
- Git
- pip

### 1. Clone the Repository

```bash
git clone https://github.com/Mohammadrh84/Spurdle.git
cd Spurdle
```

### 2. Create and Activate a Virtual Environment

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```bash
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run:

```bash
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```
### 3. Install Requirements

After activating the virtual environment, install the required Python packages:

```bash
pip install -r requirements.txt
```

### 4. Create a `.env` File

Create a file called `.env` in the project root.

Example `.env` file:

```env
SPURDLE_SECRET_KEY=dev-secret-key
SPURDLE_DATABASE_URL=sqlite:///game.db
```

The `.env` file is used to store local configuration values such as the Flask secret key and database URL.

### 5. Set Up the Database

Run the database migrations:

```bash
flask --app app db upgrade
```

This creates or updates the local database tables needed by the project.
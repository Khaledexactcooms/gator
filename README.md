# Gator

Gator is a command-line RSS feed aggregator written in TypeScript.

It allows multiple local users to add RSS feeds, follow and unfollow feeds, continuously collect posts, and browse the latest posts directly from the terminal.

## Requirements

Before running Gator, install:

- Node.js 22.15.0
- npm
- PostgreSQL 16 or newer
- Git
- NVM (recommended)

## Installation

Clone the repository:

```bash
git clone https://github.com/Khaledbaniodeh/gator.git
cd gator
```

Activate the required Node.js version:

```bash
nvm install
nvm use
```

Install the dependencies:

```bash
npm install
```

## PostgreSQL Setup

Start PostgreSQL:

```bash
sudo service postgresql start
```

Open the PostgreSQL shell:

```bash
sudo -u postgres psql
```

Create the database:

```sql
CREATE DATABASE gator;
```

Optionally, set a password for the PostgreSQL user:

```sql
ALTER USER postgres PASSWORD 'postgres';
```

Exit PostgreSQL:

```sql
\q
```

## Configuration

Create a configuration file in your home directory:

```bash
nano ~/.gatorconfig.json
```

Add the following content:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}
```

The application will automatically add `current_user_name` after registering or logging in.

## Database Migrations

Generate and run the database migrations:

```bash
npm run generate
npm run migrate
```

## Running Gator

Commands are executed using:

```bash
npm run start <command> [arguments]
```

### Register a User

```bash
npm run start register khaled
```

Registering a user also logs that user in.

### Log In

```bash
npm run start login khaled
```

### List Users

```bash
npm run start users
```

### Add a Feed

```bash
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"
```

The user who adds a feed automatically follows it.

### List All Feeds

```bash
npm run start feeds
```

### Follow a Feed

```bash
npm run start follow "https://news.ycombinator.com/rss"
```

### Unfollow a Feed

```bash
npm run start unfollow "https://news.ycombinator.com/rss"
```

### List Followed Feeds

```bash
npm run start following
```

### Start the Feed Aggregator

The `agg` command continuously collects posts. It accepts durations such as `500ms`, `10s`, `1m`, or `1h`.

```bash
npm run start agg 1m
```

Stop the aggregator using:

```text
Ctrl+C
```

### Browse Posts

Show the latest two posts:

```bash
npm run start browse
```

Show a custom number of posts:

```bash
npm run start browse 10
```

### Reset the Database

This command deletes all users and their related data:

```bash
npm run start reset
```

Use this command carefully.

## Development

Check the TypeScript code:

```bash
npx tsc --noEmit
```

Run the application:

```bash
npm run start
```

## Technologies

- TypeScript
- Node.js
- PostgreSQL
- Drizzle ORM
- fast-xml-parser
